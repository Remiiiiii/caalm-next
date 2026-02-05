/**
 * Redis cache service for Next.js application
 * Supports both Vercel KV and ioredis for flexibility
 */

import { kv } from '@vercel/kv';
import Redis from 'ioredis';

// Check if Redis is available
const isRedisAvailable = !!(
  process.env.KV_REST_API_URL || process.env.REDIS_URL
);

// Check which Redis implementation to use
const useVercelKV = !!process.env.KV_REST_API_URL;
const useStandardRedis = !!process.env.REDIS_URL && !useVercelKV;

/**
 * Redis cache interface
 */
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(pattern: string): Promise<void>;
}

/**
 * In-memory cache fallback for development
 */
class InMemoryCache implements CacheService {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    const expiry = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async clear(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Vercel KV implementation
 */
class VercelKVCache implements CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await kv.get<T>(key);
      return value;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      await kv.set(key, value, { ex: ttl });
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await kv.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async clear(pattern: string): Promise<void> {
    try {
      // Vercel KV doesn't support pattern deletion directly
      // This would require scanning all keys, which is not efficient
      // Consider using a namespace pattern instead
      console.warn('Pattern deletion not fully supported in Vercel KV');
    } catch (error) {
      console.error('Redis CLEAR error:', error);
    }
  }
}

/**
 * Standard Redis implementation using ioredis
 */
class StandardRedisCache implements CacheService {
  private client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async clear(pattern: string): Promise<void> {
    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      const pipeline = this.client.pipeline();
      let keysToDelete: string[] = [];

      stream.on('data', (keys: string[]) => {
        keysToDelete = keysToDelete.concat(keys);
        if (keysToDelete.length >= 100) {
          keysToDelete.forEach((key) => pipeline.del(key));
          keysToDelete = [];
        }
      });

      stream.on('end', async () => {
        if (keysToDelete.length > 0) {
          keysToDelete.forEach((key) => pipeline.del(key));
        }
        await pipeline.exec();
      });
    } catch (error) {
      console.error('Redis CLEAR error:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

/**
 * Create cache service instance
 */
function createCacheService(): CacheService {
  if (isRedisAvailable) {
    if (useVercelKV) {
      console.log('Using Vercel KV for Redis caching');
      return new VercelKVCache();
    } else if (useStandardRedis) {
      console.log('Using standard Redis (ioredis) for caching');
      return new StandardRedisCache();
    }
  }

  // Fallback to in-memory cache for development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'Using in-memory cache fallback. Consider setting up Redis for production.'
    );
    return new InMemoryCache();
  }

  // Production without Redis - return a no-op cache
  console.error(
    'Redis not available in production. Using no-op cache. Please configure KV_REST_API_URL or REDIS_URL.'
  );
  return new InMemoryCache();
}

/**
 * Global cache instance
 */
const cacheService = createCacheService();

/**
 * Get value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  const startTime = Date.now();
  const value = await cacheService.get<T>(key);
  const duration = Date.now() - startTime;

  // Track metrics
  if (process.env.NODE_ENV !== 'test') {
    const { recordCacheHit, recordCacheMiss } = await import('./cache-metrics');
    if (value) {
      recordCacheHit(key, duration);
    } else {
      recordCacheMiss(key, duration);
    }
  }

  // Only log in development to reduce production overhead
  if (process.env.NODE_ENV === 'development') {
    if (value) {
      console.log(`Cache HIT: ${key} (${duration}ms)`);
    } else {
      console.log(`Cache MISS: ${key} (${duration}ms)`);
    }
  }

  return value;
}

/**
 * Set value in cache with TTL
 */
export async function set(
  key: string,
  value: any,
  ttl: number = 300
): Promise<void> {
  // Only log in development to reduce production overhead
  if (process.env.NODE_ENV === 'development') {
    const startTime = Date.now();
    await cacheService.set(key, value, ttl);
    const duration = Date.now() - startTime;
    console.log(`Cache SET: ${key} (TTL: ${ttl}s, ${duration}ms)`);
  } else {
    await cacheService.set(key, value, ttl);
  }
}

/**
 * Delete key from cache
 */
export async function del(key: string): Promise<void> {
  await cacheService.del(key);
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Cache DEL: ${key}`);
  }
}

/**
 * Check if key exists in cache
 */
export async function exists(key: string): Promise<boolean> {
  return await cacheService.exists(key);
}

/**
 * Clear cache entries matching pattern
 */
export async function clear(pattern: string): Promise<void> {
  await cacheService.clear(pattern);
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Cache CLEAR: ${pattern}`);
  }
}

/**
 * Get or set pattern with automatic caching.
 * If Redis is unavailable (e.g. ENOTFOUND, ECONNRESET), falls back to fetchFn only.
 */
export async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  try {
    const cached = await get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();

    try {
      await set(key, fresh, ttl);
    } catch {
      // Cache write failed (e.g. Redis down); return fresh data anyway
    }

    return fresh;
  } catch {
    // Cache read failed or fetchFn threw; fall back to fetch only so the app keeps working
    return fetchFn();
  }
}

/**
 * Cache statistics
 */
export async function getStats(): Promise<{
  available: boolean;
  type: string;
  provider?: string;
}> {
  let provider: string | undefined;
  if (isRedisAvailable) {
    if (useVercelKV) {
      provider = 'vercel-kv';
    } else if (useStandardRedis) {
      provider = 'standard-redis';
    }
  }

  return {
    available: isRedisAvailable,
    type: isRedisAvailable ? 'redis' : 'memory',
    provider,
  };
}

/**
 * Health check for cache service
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const testKey = '__health_check__';
    await set(testKey, { timestamp: Date.now() }, 10);
    const value = await get(testKey);
    await del(testKey);

    const latency = Date.now() - startTime;

    if (value) {
      return {
        healthy: true,
        latency,
      };
    }

    return {
      healthy: false,
      latency,
      error: 'Cache read failed',
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default {
  get,
  set,
  del,
  exists,
  clear,
  getOrSet,
  getStats,
  healthCheck,
};
