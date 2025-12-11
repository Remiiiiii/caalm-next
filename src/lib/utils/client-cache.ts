/**
 * Client-side cache utility for stale-while-revalidate pattern
 * Uses localStorage/sessionStorage to store cached data
 */

const CACHE_PREFIX = 'caalm_cache_';
const CACHE_VERSION = '1.0';

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

/**
 * Get cached data from client storage
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const parsed: CachedData<T> = JSON.parse(cached);
    
    // Check version compatibility
    if (parsed.version !== CACHE_VERSION) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return parsed.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reading cache:', error);
    }
    return null;
  }
}

/**
 * Set cached data in client storage
 */
export function setCachedData<T>(key: string, data: T, maxAge: number = 300000): void {
  if (typeof window === 'undefined') return;

  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
    
    // Auto-cleanup after maxAge
    setTimeout(() => {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
    }, maxAge);
  } catch (error) {
    // Handle quota exceeded errors gracefully
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Clear old cache entries
      clearOldCache();
      try {
        sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
          data,
          timestamp: Date.now(),
          version: CACHE_VERSION,
        }));
      } catch {
        // If still fails, just skip caching
        if (process.env.NODE_ENV === 'development') {
          console.warn('Cache storage full, skipping cache');
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.error('Error writing cache:', error);
    }
  }
}

/**
 * Clear old cache entries (older than 1 hour)
 */
function clearOldCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const oneHourAgo = Date.now() - 3600000;
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const cached = sessionStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.timestamp < oneHourAgo) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error clearing old cache:', error);
    }
  }
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error clearing cache:', error);
    }
  }
}

