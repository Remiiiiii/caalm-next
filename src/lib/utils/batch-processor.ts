/**
 * Batch processor utilities for efficient parallel processing
 * Provides retry logic, timeout protection, and progress tracking
 */

interface BatchOptions<T> {
  batchSize?: number;
  concurrency?: number;
  timeout?: number;
  retries?: number;
  onProgress?: (completed: number, total: number) => void;
  onError?: (item: T, error: Error) => void;
}

interface BatchResult<T> {
  successful: T[];
  failed: Array<{ item: T; error: Error }>;
  total: number;
  processed: number;
}

/**
 * Process items in batches with concurrency control
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions<T> = {}
): Promise<BatchResult<R>> {
  const {
    batchSize = 10,
    concurrency = 5,
    timeout = 30000,
    retries = 1,
    onProgress,
    onError,
  } = options;

  const successful: R[] = [];
  const failed: Array<{ item: T; error: Error }> = [];
  let processed = 0;

  // Split items into batches
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(
    `Processing ${items.length} items in ${batches.length} batches of ${batchSize}`
  );

  // Process each batch
  for (const batch of batches) {
    const batchResults = await processBatchWithConcurrency(
      batch,
      processor,
      concurrency,
      timeout,
      retries
    );

    // Collect results
    for (const result of batchResults) {
      if (result.success) {
        successful.push(result.value);
      } else {
        failed.push(result);
        onError?.(result.item, result.error);
      }
      processed++;
      onProgress?.(processed, items.length);
    }
  }

  return {
    successful,
    failed,
    total: items.length,
    processed,
  };
}

/**
 * Process a single batch with concurrency control
 */
async function processBatchWithConcurrency<T, R>(
  batch: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number,
  timeout: number,
  retries: number
): Promise<
  Array<{ success: true; value: R } | { success: false; item: T; error: Error }>
> {
  const results: Array<
    { success: true; value: R } | { success: false; item: T; error: Error }
  > = [];
  const queue = [...batch];

  // Process items with concurrency limit
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, batch.length); i++) {
    workers.push(processWithRetry(queue, processor, timeout, retries, results));
  }

  await Promise.all(workers);

  return results;
}

/**
 * Process items from queue with retry logic
 */
async function processWithRetry<T, R>(
  queue: T[],
  processor: (item: T) => Promise<R>,
  timeout: number,
  retries: number,
  results: Array<
    { success: true; value: R } | { success: false; item: T; error: Error }
  >
): Promise<void> {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      try {
        const value = await Promise.race([
          processor(item),
          new Promise<R>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);

        results.push({ success: true, value });
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt <= retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retry attempt ${attempt} for item (${delay}ms delay)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError && attempt > retries) {
      results.push({ success: false, item, error: lastError });
    }
  }
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Calculate delay for exponential backoff
 */
export function getExponentialBackoffDelay(
  attempt: number,
  base = 1000
): number {
  return base * Math.pow(2, attempt);
}

/**
 * Process with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}
