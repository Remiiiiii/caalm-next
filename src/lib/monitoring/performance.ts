/**
 * Performance monitoring and metrics collection
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceEntry {
  apiPath: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

/**
 * Store performance metrics
 */
const metrics: PerformanceMetric[] = [];
const apiLogs: PerformanceEntry[] = [];

/**
 * Add a performance metric
 */
export function addMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
) {
  metrics.push({
    name,
    value,
    timestamp: Date.now(),
    tags,
  });

  // Keep only last 1000 metrics to prevent memory issues
  if (metrics.length > 1000) {
    metrics.splice(0, metrics.length - 1000);
  }
}

/**
 * Log API performance
 */
export function logApiPerformance(
  path: string,
  method: string,
  duration: number,
  status: number
) {
  apiLogs.push({
    apiPath: path,
    method,
    duration,
    status,
    timestamp: Date.now(),
  });

  // Keep only last 500 entries
  if (apiLogs.length > 500) {
    apiLogs.splice(0, apiLogs.length - 500);
  }

  // Log slow requests
  if (duration > 1000) {
    console.warn(
      `Slow API request detected: ${method} ${path} took ${duration}ms`
    );
  }
}

/**
 * Get performance metrics
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/**
 * Get API performance logs
 */
export function getApiLogs(): PerformanceEntry[] {
  return [...apiLogs];
}

/**
 * Get API performance statistics
 */
export function getApiStats() {
  const stats = {
    totalRequests: apiLogs.length,
    averageDuration: 0,
    slowestEndpoint: '',
    slowestDuration: 0,
    errorRate: 0,
    requestsByStatus: {} as Record<number, number>,
  };

  if (apiLogs.length === 0) {
    return stats;
  }

  let totalDuration = 0;
  let errorCount = 0;

  for (const log of apiLogs) {
    totalDuration += log.duration;

    if (log.duration > stats.slowestDuration) {
      stats.slowestDuration = log.duration;
      stats.slowestEndpoint = `${log.method} ${log.apiPath}`;
    }

    if (log.status >= 400) {
      errorCount++;
    }

    stats.requestsByStatus[log.status] =
      (stats.requestsByStatus[log.status] || 0) + 1;
  }

  stats.averageDuration = Math.round(totalDuration / apiLogs.length);
  stats.errorRate = (errorCount / apiLogs.length) * 100;

  return stats;
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics() {
  metrics.length = 0;
  apiLogs.length = 0;
}

/**
 * Wrapper for monitoring async functions
 */
export function monitorAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      addMetric(name, duration, { success: 'true' });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      addMetric(name, duration, { success: 'false', error: String(error) });
      throw error;
    }
  }) as T;
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`[Performance] ${label} took ${duration}ms`);
    addMetric(label, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Performance] ${label} failed after ${duration}ms`);
    addMetric(label, duration, { error: String(error) });
    throw error;
  }
}
