/**
 * Request Deduplication Utility
 * Prevents multiple concurrent requests for the same resource
 */

interface PendingRequest<T> {
	promise: Promise<T>;
	timestamp: number;
}

class RequestDeduplicator {
	private pendingRequests = new Map<string, PendingRequest<any>>();
	private readonly MAX_AGE = 30000; // 30 seconds max age for pending requests

	/**
	 * Deduplicate a request - if a request for the same key is already pending,
	 * return the existing promise instead of making a new request
	 */
	async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
		// Clean up stale requests
		this.cleanup();

		// Check if there's already a pending request
		const existing = this.pendingRequests.get(key);
		if (existing) {
			// Check if it's still valid (not too old)
			const age = Date.now() - existing.timestamp;
			if (age < this.MAX_AGE) {
				return existing.promise;
			} else {
				// Request is too old, remove it
				this.pendingRequests.delete(key);
			}
		}

		// Create new request
		const promise = requestFn()
			.then((result) => {
				// Remove from pending when complete
				this.pendingRequests.delete(key);
				return result;
			})
			.catch((error) => {
				// Remove from pending on error
				this.pendingRequests.delete(key);
				throw error;
			});

		// Store the pending request
		this.pendingRequests.set(key, {
			promise,
			timestamp: Date.now(),
		});

		return promise;
	}

	/**
	 * Clean up stale pending requests
	 */
	private cleanup(): void {
		const now = Date.now();
		for (const [key, request] of this.pendingRequests.entries()) {
			const age = now - request.timestamp;
			if (age >= this.MAX_AGE) {
				this.pendingRequests.delete(key);
			}
		}
	}

	/**
	 * Clear all pending requests (useful for testing or cleanup)
	 */
	clear(): void {
		this.pendingRequests.clear();
	}

	/**
	 * Get count of pending requests
	 */
	getPendingCount(): number {
		return this.pendingRequests.size;
	}
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Deduplicate a request by key
 */
export async function deduplicateRequest<T>(
	key: string,
	requestFn: () => Promise<T>,
): Promise<T> {
	return requestDeduplicator.deduplicate(key, requestFn);
}
