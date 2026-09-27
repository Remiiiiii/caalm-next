/**
 * Redis rate limiting operations
 * Provides atomic operations for rate limiting algorithms
 * Supports both Vercel KV and ioredis
 */

import { kv } from "@vercel/kv";
import Redis from "ioredis";
import redis from "../redis-client";

// Check if Redis is available
const isRedisAvailable = !!(
	process.env.KV_REST_API_URL || process.env.REDIS_URL
);

// Prefer Layerbase (REDIS_URL / ioredis) over Vercel KV when both are set
const useStandardRedis = !!process.env.REDIS_URL;
const useVercelKV = !!process.env.KV_REST_API_URL && !useStandardRedis;

/**
 * Rate limit operation result
 */
export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: number;
	retryAfter?: number;
}

/**
 * Token bucket state
 */
interface TokenBucketState {
	tokens: number;
	lastRefill: number;
}

/**
 * Rate limit service interface
 */
interface RateLimitService {
	increment(key: string, ttl: number): Promise<number>;
	incrementWithExpiry(
		key: string,
		ttl: number,
	): Promise<{ count: number; ttl: number }>;
	tokenBucketRefill(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<TokenBucketState>;
	tokenBucketConsume(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
	slidingWindowIncrement(
		key: string,
		windowSize: number,
		limit: number,
	): Promise<RateLimitResult>;
	setBan(key: string, duration: number): Promise<void>;
	isBanned(key: string): Promise<boolean>;
	getRawClient(): Redis | null;
}

/** Local backup sliding window: key → request timestamps (ms) */
const fallbackSliders = new Map<string, number[]>();

const DEFAULT_SLIDING_WINDOW_SEC = 60;
const DEFAULT_SLIDING_MAX_REQUESTS = 100;

function slidingWindowResultFromCount(
	windowSizeSec: number,
	limit: number,
	current: number,
	now = Date.now(),
): RateLimitResult {
	const allowed = current <= limit;
	return {
		allowed,
		remaining: Math.max(0, limit - current),
		resetTime: Math.floor(now / 1000) + windowSizeSec,
		retryAfter: allowed ? undefined : windowSizeSec,
	};
}

function slidingWindowMemoryFallback(
	key: string,
	windowMs: number,
	limit: number,
): { current: number; result: RateLimitResult } {
	const now = Date.now();
	const clearBefore = now - windowMs;

	let timestamps = fallbackSliders.get(key) || [];
	timestamps = timestamps.filter((timestamp) => timestamp > clearBefore);
	timestamps.push(now);
	fallbackSliders.set(key, timestamps);

	const current = timestamps.length;
	return {
		current,
		result: slidingWindowResultFromCount(
			Math.ceil(windowMs / 1000),
			limit,
			current,
			now,
		),
	};
}

async function slidingWindowRedisZset(
	key: string,
	windowMs: number,
	limit: number,
): Promise<{ current: number; result: RateLimitResult }> {
	const now = Date.now();
	const clearBefore = now - windowMs;
	const windowSizeSec = Math.ceil(windowMs / 1000);

	const pipeline = redis.pipeline();
	pipeline.zremrangebyscore(key, 0, clearBefore);
	pipeline.zadd(key, now, `${now}-${Math.random()}`);
	pipeline.zcard(key);
	pipeline.expire(key, windowSizeSec + 5);

	const results = await pipeline.exec();
	if (!results) {
		throw new Error("Redis sliding window pipeline returned no results");
	}

	const zcardEntry = results[2];
	if (zcardEntry[0]) {
		throw zcardEntry[0];
	}

	const current = zcardEntry[1] as number;
	return {
		current,
		result: slidingWindowResultFromCount(windowSizeSec, limit, current, now),
	};
}

async function slidingWindowPreciseWithCount(
	key: string,
	windowSizeSec: number,
	limit: number,
): Promise<{ current: number; result: RateLimitResult }> {
	const windowMs = windowSizeSec * 1000;

	if (!useStandardRedis) {
		return slidingWindowMemoryFallback(key, windowMs, limit);
	}

	try {
		return await slidingWindowRedisZset(key, windowMs, limit);
	} catch (error) {
		console.warn(
			"[SERVER] Layerbase connection cap hit or Redis error. Executing local sliding window fallback.",
			error,
		);
		return slidingWindowMemoryFallback(key, windowMs, limit);
	}
}

/**
 * Layerbase ZSET sliding window with in-memory fallback when Redis is unavailable.
 */
async function slidingWindowPrecise(
	key: string,
	windowSizeSec: number,
	limit: number,
): Promise<RateLimitResult> {
	return (await slidingWindowPreciseWithCount(key, windowSizeSec, limit))
		.result;
}

/**
 * Wipe expired sliding-window arrays from serverless instance memory.
 */
export function pruneFallbackSlidingWindowMemory(
	windowMs: number = DEFAULT_SLIDING_WINDOW_SEC * 1000,
): void {
	const now = Date.now();
	const clearBefore = now - windowMs;

	for (const [key, timestamps] of fallbackSliders.entries()) {
		const validTimestamps = timestamps.filter((t) => t > clearBefore);
		if (validTimestamps.length === 0) {
			fallbackSliders.delete(key);
		} else {
			fallbackSliders.set(key, validTimestamps);
		}
	}
}

/**
 * In-memory rate limit service for development
 */
class InMemoryRateLimitService implements RateLimitService {
	private counters: Map<string, { count: number; expiry: number }> = new Map();
	private tokenBuckets: Map<string, TokenBucketState> = new Map();
	private bans: Map<string, number> = new Map();

	private windowMs = DEFAULT_SLIDING_WINDOW_SEC * 1000;
	private maxRequests = DEFAULT_SLIDING_MAX_REQUESTS;

	/**
	 * Precise sliding-window check (Redis ZSET when configured, else local timestamps).
	 */
	async handleRateLimit(
		ipOrIdentifier: string,
	): Promise<{ success: boolean; current: number }> {
		const key = `ratelimit:sliding:${ipOrIdentifier}`;
		const { current, result } = await this.executeSlidingWindow(key);
		return { success: result.allowed, current };
	}

	private async executeSlidingWindow(
		key: string,
		windowSizeSec = DEFAULT_SLIDING_WINDOW_SEC,
		limit = this.maxRequests,
	): Promise<{ current: number; result: RateLimitResult }> {
		return slidingWindowPreciseWithCount(key, windowSizeSec, limit);
	}

	public pruneFallbackMemory(): void {
		pruneFallbackSlidingWindowMemory(this.windowMs);
	}

	async increment(key: string, ttl: number): Promise<number> {
		const now = Date.now();
		const expiry = now + ttl * 1000;

		const existing = this.counters.get(key);
		if (existing && now < existing.expiry) {
			existing.count++;
			return existing.count;
		}

		this.counters.set(key, { count: 1, expiry });
		return 1;
	}

	async incrementWithExpiry(
		key: string,
		ttl: number,
	): Promise<{ count: number; ttl: number }> {
		const count = await this.increment(key, ttl);
		const existing = this.counters.get(key);
		const remainingTtl = existing
			? Math.max(0, Math.floor((existing.expiry - Date.now()) / 1000))
			: ttl;
		return { count, ttl: remainingTtl };
	}

	async tokenBucketRefill(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<TokenBucketState> {
		const now = Date.now();
		const existing = this.tokenBuckets.get(key);

		if (!existing) {
			const state: TokenBucketState = {
				tokens: capacity,
				lastRefill: now,
			};
			this.tokenBuckets.set(key, state);
			return state;
		}

		// Calculate tokens to add
		const timePassed = now - existing.lastRefill;
		const intervalsPassed = Math.floor(timePassed / refillInterval);
		const tokensToAdd = intervalsPassed * refillRate;

		if (tokensToAdd > 0) {
			existing.tokens = Math.min(capacity, existing.tokens + tokensToAdd);
			existing.lastRefill = now;
		}

		return existing;
	}

	async tokenBucketConsume(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
		const state = await this.tokenBucketRefill(
			key,
			capacity,
			refillRate,
			refillInterval,
		);

		if (state.tokens >= 1) {
			state.tokens -= 1;
			const resetTime =
				Math.floor(Date.now() / 1000) + Math.ceil(capacity / refillRate);
			return {
				allowed: true,
				remaining: Math.floor(state.tokens),
				resetTime,
			};
		}

		const resetTime = Math.floor(
			(state.lastRefill + (1 / refillRate) * 1000) / 1000,
		);
		return {
			allowed: false,
			remaining: 0,
			resetTime,
		};
	}

	async slidingWindowIncrement(
		key: string,
		windowSize: number,
		limit: number,
	): Promise<RateLimitResult> {
		return (await this.executeSlidingWindow(key, windowSize, limit)).result;
	}

	async setBan(key: string, duration: number): Promise<void> {
		const expiry = Date.now() + duration * 1000;
		this.bans.set(key, expiry);
	}

	async isBanned(key: string): Promise<boolean> {
		const banExpiry = this.bans.get(key);
		if (!banExpiry) return false;

		if (Date.now() >= banExpiry) {
			this.bans.delete(key);
			return false;
		}

		return true;
	}

	getRawClient(): Redis | null {
		return null;
	}
}

/**
 * Vercel KV rate limit service
 * Note: Vercel KV has limited support for atomic operations
 */
class VercelKVRateLimitService implements RateLimitService {
	async increment(key: string, ttl: number): Promise<number> {
		try {
			// Vercel KV doesn't have native INCR, so we use get/set with retry
			const current = (await kv.get<number>(key)) || 0;
			const newValue = current + 1;
			await kv.set(key, newValue, { ex: ttl });
			return newValue;
		} catch (error) {
			console.error("Vercel KV INCR error:", error);
			return 0;
		}
	}

	async incrementWithExpiry(
		key: string,
		ttl: number,
	): Promise<{ count: number; ttl: number }> {
		const count = await this.increment(key, ttl);
		// Vercel KV doesn't support TTL query, so we estimate
		return { count, ttl };
	}

	async tokenBucketRefill(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<TokenBucketState> {
		try {
			const state = (await kv.get<TokenBucketState>(key)) || {
				tokens: capacity,
				lastRefill: Date.now(),
			};

			const now = Date.now();
			const timePassed = now - state.lastRefill;
			const intervalsPassed = Math.floor(timePassed / refillInterval);
			const tokensToAdd = intervalsPassed * refillRate;

			if (tokensToAdd > 0) {
				state.tokens = Math.min(capacity, state.tokens + tokensToAdd);
				state.lastRefill = now;
				await kv.set(key, state, { ex: 3600 }); // Store for 1 hour
			}

			return state;
		} catch (error) {
			console.error("Vercel KV token bucket error:", error);
			return { tokens: capacity, lastRefill: Date.now() };
		}
	}

	async tokenBucketConsume(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
		const state = await this.tokenBucketRefill(
			key,
			capacity,
			refillRate,
			refillInterval,
		);

		if (state.tokens >= 1) {
			state.tokens -= 1;
			await kv.set(key, state, { ex: 3600 });
			const resetTime =
				Math.floor(Date.now() / 1000) + Math.ceil(capacity / refillRate);
			return {
				allowed: true,
				remaining: Math.floor(state.tokens),
				resetTime,
			};
		}

		const resetTime = Math.floor(
			(state.lastRefill + (1 / refillRate) * 1000) / 1000,
		);
		return {
			allowed: false,
			remaining: 0,
			resetTime,
		};
	}

	async slidingWindowIncrement(
		key: string,
		windowSize: number,
		limit: number,
	): Promise<RateLimitResult> {
		return slidingWindowPrecise(key, windowSize, limit);
	}

	async setBan(key: string, duration: number): Promise<void> {
		try {
			await kv.set(`ban:${key}`, true, { ex: duration });
		} catch (error) {
			console.error("Vercel KV ban error:", error);
		}
	}

	async isBanned(key: string): Promise<boolean> {
		try {
			const banned = await kv.get<boolean>(`ban:${key}`);
			return banned === true;
		} catch (error) {
			console.error("Vercel KV ban check error:", error);
			return false;
		}
	}

	getRawClient(): Redis | null {
		return null;
	}
}

/**
 * Standard Redis rate limit service using ioredis
 * Supports atomic operations and Lua scripts
 * Uses shared Layerbase Redis client
 */
class StandardRedisRateLimitService implements RateLimitService {
	private client: Redis;

	// Lua script for token bucket refill and consume (atomic operation)
	private readonly TOKEN_BUCKET_SCRIPT = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local refillInterval = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])
    local consume = tonumber(ARGV[5]) or 0
    
    local state = redis.call('GET', key)
    local tokens = capacity
    local lastRefill = now
    
    if state then
      local data = cjson.decode(state)
      tokens = tonumber(data.tokens)
      lastRefill = tonumber(data.lastRefill)
      
      local timePassed = now - lastRefill
      local intervalsPassed = math.floor(timePassed / refillInterval)
      local tokensToAdd = intervalsPassed * refillRate
      
      if tokensToAdd > 0 then
        tokens = math.min(capacity, tokens + tokensToAdd)
        lastRefill = now
      end
    end
    
    local allowed = false
    local remaining = tokens
    
    if consume > 0 and tokens >= 1 then
      tokens = tokens - 1
      allowed = true
      remaining = tokens
    end
    
    local newState = cjson.encode({tokens=tokens, lastRefill=lastRefill})
    redis.call('SET', key, newState, 'EX', 3600)
    
    return cjson.encode({allowed=allowed, remaining=remaining, tokens=tokens, lastRefill=lastRefill})
  `;

	constructor() {
		// Use shared Layerbase Redis client
		this.client = redis;
	}

	async increment(key: string, ttl: number): Promise<number> {
		try {
			const count = await this.client.incr(key);
			if (count === 1) {
				// First increment, set expiry
				await this.client.expire(key, ttl);
			}
			return count;
		} catch (error) {
			console.error("Redis INCR error:", error);
			return 0;
		}
	}

	async incrementWithExpiry(
		key: string,
		ttl: number,
	): Promise<{ count: number; ttl: number }> {
		try {
			const count = await this.increment(key, ttl);
			const remainingTtl = await this.client.ttl(key);
			return { count, ttl: remainingTtl > 0 ? remainingTtl : ttl };
		} catch (error) {
			console.error("Redis INCR with expiry error:", error);
			return { count: 0, ttl: ttl };
		}
	}

	async tokenBucketRefill(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<TokenBucketState> {
		try {
			const now = Date.now();
			const result = await this.client.eval(
				this.TOKEN_BUCKET_SCRIPT,
				1,
				key,
				capacity.toString(),
				refillRate.toString(),
				refillInterval.toString(),
				now.toString(),
				"0", // Don't consume
			);

			if (typeof result === "string") {
				const data = JSON.parse(result);
				return { tokens: data.tokens, lastRefill: data.lastRefill };
			}

			// Fallback if script fails
			return { tokens: capacity, lastRefill: now };
		} catch (error) {
			console.error("Redis token bucket error:", error);
			// Fallback to non-atomic operation
			const stateStr = await this.client.get(key);
			if (stateStr) {
				const state = JSON.parse(stateStr) as TokenBucketState;
				const now = Date.now();
				const timePassed = now - state.lastRefill;
				const intervalsPassed = Math.floor(timePassed / refillInterval);
				const tokensToAdd = intervalsPassed * refillRate;

				if (tokensToAdd > 0) {
					state.tokens = Math.min(capacity, state.tokens + tokensToAdd);
					state.lastRefill = now;
					await this.client.setex(key, 3600, JSON.stringify(state));
				}
				return state;
			}

			return { tokens: capacity, lastRefill: Date.now() };
		}
	}

	async tokenBucketConsume(
		key: string,
		capacity: number,
		refillRate: number,
		refillInterval: number,
	): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
		try {
			const now = Date.now();
			const result = await this.client.eval(
				this.TOKEN_BUCKET_SCRIPT,
				1,
				key,
				capacity.toString(),
				refillRate.toString(),
				refillInterval.toString(),
				now.toString(),
				"1", // Consume token
			);

			if (typeof result === "string") {
				const data = JSON.parse(result);
				const resetTime =
					Math.floor(Date.now() / 1000) + Math.ceil(capacity / refillRate);
				return {
					allowed: data.allowed,
					remaining: data.remaining,
					resetTime,
				};
			}

			// Fallback
			return {
				allowed: false,
				remaining: 0,
				resetTime: Math.floor(Date.now() / 1000) + 60,
			};
		} catch (error) {
			console.error("Redis token bucket consume error:", error);
			// Fallback to refill and check
			const state = await this.tokenBucketRefill(
				key,
				capacity,
				refillRate,
				refillInterval,
			);
			if (state.tokens >= 1) {
				state.tokens -= 1;
				await this.client.setex(key, 3600, JSON.stringify(state));
				const resetTime =
					Math.floor(Date.now() / 1000) + Math.ceil(capacity / refillRate);
				return {
					allowed: true,
					remaining: Math.floor(state.tokens),
					resetTime,
				};
			}
			const resetTime = Math.floor(
				(state.lastRefill + (1 / refillRate) * 1000) / 1000,
			);
			return {
				allowed: false,
				remaining: 0,
				resetTime,
			};
		}
	}

	async slidingWindowIncrement(
		key: string,
		windowSize: number,
		limit: number,
	): Promise<RateLimitResult> {
		return slidingWindowPrecise(key, windowSize, limit);
	}

	async setBan(key: string, duration: number): Promise<void> {
		try {
			await this.client.setex(`ban:${key}`, duration, "1");
		} catch (error) {
			console.error("Redis ban error:", error);
		}
	}

	async isBanned(key: string): Promise<boolean> {
		try {
			const banned = await this.client.exists(`ban:${key}`);
			return banned === 1;
		} catch (error) {
			console.error("Redis ban check error:", error);
			return false;
		}
	}

	getRawClient(): Redis | null {
		return this.client;
	}
}

/**
 * Create rate limit service instance
 */
function createRateLimitService(): RateLimitService {
	if (isRedisAvailable) {
		if (useStandardRedis) {
			console.log("Using Layerbase Redis (ioredis) for rate limiting");
			return new StandardRedisRateLimitService();
		}
		if (useVercelKV) {
			console.log("Using Vercel KV for rate limiting");
			return new VercelKVRateLimitService();
		}
	}

	// Fallback to in-memory for development
	if (process.env.NODE_ENV === "development") {
		console.warn(
			"Using in-memory rate limiting fallback. Consider setting up Redis for production.",
		);
		return new InMemoryRateLimitService();
	}

	// Production without Redis - use in-memory as fallback
	console.error(
		"Redis not available in production. Using in-memory rate limiting. Please configure KV_REST_API_URL or REDIS_URL.",
	);
	return new InMemoryRateLimitService();
}

/**
 * Global rate limit service instance
 */
const rateLimitService = createRateLimitService();

/**
 * Increment counter with TTL
 */
export async function increment(key: string, ttl: number): Promise<number> {
	return rateLimitService.increment(key, ttl);
}

/**
 * Increment counter and get remaining TTL
 */
export async function incrementWithExpiry(
	key: string,
	ttl: number,
): Promise<{ count: number; ttl: number }> {
	return rateLimitService.incrementWithExpiry(key, ttl);
}

/**
 * Token bucket refill operation (atomic)
 */
export async function tokenBucketRefill(
	key: string,
	capacity: number,
	refillRate: number,
	refillInterval: number,
): Promise<TokenBucketState> {
	return rateLimitService.tokenBucketRefill(
		key,
		capacity,
		refillRate,
		refillInterval,
	);
}

/**
 * Token bucket consume operation (atomic)
 */
export async function tokenBucketConsume(
	key: string,
	capacity: number,
	refillRate: number,
	refillInterval: number,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
	return rateLimitService.tokenBucketConsume(
		key,
		capacity,
		refillRate,
		refillInterval,
	);
}

/**
 * Sliding window increment (atomic)
 */
export async function slidingWindowIncrement(
	key: string,
	windowSize: number,
	limit: number,
): Promise<RateLimitResult> {
	return rateLimitService.slidingWindowIncrement(key, windowSize, limit);
}

/**
 * Sliding-window rate limit by identifier (1-minute / 100-request defaults when omitted).
 */
export async function handleRateLimit(
	ipOrIdentifier: string,
	options?: { windowSec?: number; maxRequests?: number },
): Promise<{ success: boolean; current: number }> {
	const windowSec = options?.windowSec ?? DEFAULT_SLIDING_WINDOW_SEC;
	const maxRequests = options?.maxRequests ?? DEFAULT_SLIDING_MAX_REQUESTS;
	const key = `ratelimit:sliding:${ipOrIdentifier}`;
	const { current, result } = await slidingWindowPreciseWithCount(
		key,
		windowSec,
		maxRequests,
	);
	return { success: result.allowed, current };
}

/**
 * Set ban for identifier
 */
export async function setBan(key: string, duration: number): Promise<void> {
	return rateLimitService.setBan(key, duration);
}

/**
 * Check if identifier is banned
 */
export async function isBanned(key: string): Promise<boolean> {
	return rateLimitService.isBanned(key);
}

/**
 * Get raw Redis client (for advanced operations)
 */
export function getRawRedisClient(): Redis | null {
	return rateLimitService.getRawClient();
}

export type { RateLimitService, TokenBucketState };
export default {
	increment,
	incrementWithExpiry,
	tokenBucketRefill,
	slidingWindowIncrement,
	handleRateLimit,
	pruneFallbackSlidingWindowMemory,
	setBan,
	isBanned,
	getRawRedisClient,
};
