/**
 * Client-side cache for stale-while-revalidate.
 * localStorage survives refresh and new tabs (sessionStorage does not across tabs).
 * Stale rows are still returned so the sidebar can paint immediately.
 */

const CACHE_PREFIX = "caalm_cache_";
const CACHE_VERSION = "1.2";
/** Drop rows older than this. Younger stale rows are still used for first paint. */
const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedData<T> {
	data: T;
	timestamp: number;
	version: string;
}

function cacheStorageKey(key: string): string {
	return `${CACHE_PREFIX}${key}`;
}

function readFromStorage<T>(storage: Storage, storageKey: string): T | null {
	const cached = storage.getItem(storageKey);
	if (!cached) return null;

	const parsed: CachedData<T> = JSON.parse(cached);

	if (parsed.version !== CACHE_VERSION && parsed.version !== "1.1") {
		storage.removeItem(storageKey);
		return null;
	}

	if (
		typeof parsed.timestamp === "number" &&
		Date.now() - parsed.timestamp > MAX_STALE_MS
	) {
		storage.removeItem(storageKey);
		return null;
	}

	return parsed.data;
}

/**
 * Get cached data from client storage
 */
export function getCachedData<T>(key: string): T | null {
	if (typeof window === "undefined") return null;

	const storageKey = cacheStorageKey(key);

	try {
		const fromLocal = readFromStorage<T>(localStorage, storageKey);
		if (fromLocal !== null) return fromLocal;

		// Older builds stored cache in the tab only. Reuse it once, then move it.
		const fromSession = readFromStorage<T>(sessionStorage, storageKey);
		if (fromSession !== null) {
			setCachedData(key, fromSession);
			sessionStorage.removeItem(storageKey);
			return fromSession;
		}

		return null;
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error reading cache:", error);
		}
		return null;
	}
}

/**
 * Set cached data in client storage
 */
export function setCachedData<T>(
	key: string,
	data: T,
	_maxAge: number = 300000,
): void {
	if (typeof window === "undefined") return;

	try {
		const cached: CachedData<T> = {
			data,
			timestamp: Date.now(),
			version: CACHE_VERSION,
		};

		localStorage.setItem(cacheStorageKey(key), JSON.stringify(cached));
		sessionStorage.removeItem(cacheStorageKey(key));
	} catch (error) {
		// Handle quota exceeded errors gracefully
		if (error instanceof DOMException && error.name === "QuotaExceededError") {
			// Clear old cache entries
			clearOldCache();
			try {
				localStorage.setItem(
					cacheStorageKey(key),
					JSON.stringify({
						data,
						timestamp: Date.now(),
						version: CACHE_VERSION,
					}),
				);
			} catch {
				// If still fails, just skip caching
				if (process.env.NODE_ENV === "development") {
					console.warn("Cache storage full, skipping cache");
				}
			}
		} else if (process.env.NODE_ENV === "development") {
			console.error("Error writing cache:", error);
		}
	}
}

function removePrefixedKeys(storage: Storage): string[] {
	const keysToRemove: string[] = [];
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key?.startsWith(CACHE_PREFIX)) {
			keysToRemove.push(key);
		}
	}
	return keysToRemove;
}

/**
 * Clear old cache entries (older than 1 hour)
 */
function clearOldCache(): void {
	if (typeof window === "undefined") return;

	try {
		const oneHourAgo = Date.now() - 3600000;
		for (const storage of [localStorage, sessionStorage]) {
			const keysToRemove: string[] = [];
			for (let i = 0; i < storage.length; i++) {
				const key = storage.key(i);
				if (key?.startsWith(CACHE_PREFIX)) {
					try {
						const cached = storage.getItem(key);
						if (cached) {
							const parsed = JSON.parse(cached);
							if (parsed.timestamp < oneHourAgo) {
								keysToRemove.push(key);
							}
						}
					} catch {
						keysToRemove.push(key);
					}
				}
			}
			keysToRemove.forEach((key) => storage.removeItem(key));
		}
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error clearing old cache:", error);
		}
	}
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
	if (typeof window === "undefined") return;

	try {
		for (const storage of [localStorage, sessionStorage]) {
			removePrefixedKeys(storage).forEach((key) => storage.removeItem(key));
		}
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error clearing cache:", error);
		}
	}
}

/**
 * Clear cached data for a specific key
 */
export function clearCachedData(key: string): void {
	if (typeof window === "undefined") return;

	try {
		const storageKey = cacheStorageKey(key);
		localStorage.removeItem(storageKey);
		sessionStorage.removeItem(storageKey);
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error clearing cached data:", error);
		}
	}
}
