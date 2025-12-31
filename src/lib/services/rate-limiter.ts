/**
 * Core rate limiting service
 * Combines Token Bucket and Sliding Window algorithms
 */

import {
  tokenBucketConsume,
  slidingWindowIncrement,
  isBanned,
  TokenBucketState,
  RateLimitResult,
} from './redis-rate-limit';
import {
  getRateLimitConfig,
  getUserTier,
  type UserTier,
  type RateLimitConfig,
} from '@/lib/config/rate-limit.config';
import { penaltyService } from './rate-limiter-penalties';

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  limit: number;
  algorithm: 'token-bucket' | 'sliding-window';
}

export interface RateLimitOptions {
  endpoint: string;
  identifier: string; // user ID, IP address, or API key
  tier: UserTier;
  useTokenBucket?: boolean; // default: true for burst handling
  useSlidingWindow?: boolean; // default: true for accuracy
}

/**
 * Rate limiter service
 */
export class RateLimiter {
  /**
   * Check rate limit using hybrid approach
   * Uses Token Bucket for burst handling and Sliding Window for accuracy
   */
  async checkRateLimit(
    options: RateLimitOptions
  ): Promise<RateLimitCheckResult> {
    const { endpoint, identifier, tier, useTokenBucket = true, useSlidingWindow = true } = options;

    // Check if identifier is banned
    const banned = await isBanned(identifier);
    if (banned) {
      const config = getRateLimitConfig(endpoint, tier);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.floor(Date.now() / 1000) + 300, // 5 min default ban
        retryAfter: 300,
        limit: config.requests,
        algorithm: 'token-bucket',
      };
    }

    // Record violation if this is a repeat offender (async, don't block)
    this.recordViolationIfNeeded(identifier, endpoint, tier).catch((error) => {
      console.error('Error recording violation:', error);
    });

    // Get rate limit configuration
    const config = getRateLimitConfig(endpoint, tier);
    const { requests, window, burst } = config;

    // Use both algorithms and take the most restrictive result
    const results: RateLimitCheckResult[] = [];

    // Token Bucket Algorithm (for burst handling)
    if (useTokenBucket) {
      const tokenBucketResult = await this.checkTokenBucket(
        identifier,
        endpoint,
        requests,
        window,
        burst
      );
      results.push(tokenBucketResult);
    }

    // Sliding Window Algorithm (for accuracy)
    if (useSlidingWindow) {
      const slidingWindowResult = await this.checkSlidingWindow(
        identifier,
        endpoint,
        requests,
        window
      );
      results.push(slidingWindowResult);
    }

    // If only one algorithm is used, return its result
    if (results.length === 1) {
      return results[0];
    }

    // Take the most restrictive result (lowest remaining, earliest reset)
    const mostRestrictive = results.reduce((prev, current) => {
      if (!current.allowed) return current;
      if (!prev.allowed) return prev;
      if (current.remaining < prev.remaining) return current;
      if (current.resetTime < prev.resetTime) return current;
      return prev;
    });

    return mostRestrictive;
  }

  /**
   * Record violation if rate limit is exceeded
   * Called after rate limit check fails
   */
  async recordViolation(
    identifier: string,
    endpoint: string,
    tier: UserTier
  ): Promise<void> {
    await penaltyService.recordViolation(identifier, endpoint, tier);
  }

  /**
   * Record violation if needed (helper method)
   */
  private async recordViolationIfNeeded(
    identifier: string,
    endpoint: string,
    tier: UserTier
  ): Promise<void> {
    // This will be called after we know the rate limit was exceeded
    // Implementation will check violation count and apply bans if needed
  }

  /**
   * Token Bucket Algorithm
   * Allows burst traffic while maintaining average rate
   */
  private async checkTokenBucket(
    identifier: string,
    endpoint: string,
    requests: number,
    window: number,
    burst?: number
  ): Promise<RateLimitCheckResult> {
    const key = `ratelimit:tb:${identifier}:${endpoint}`;
    const capacity = burst || requests * 2; // Default: 2x requests for burst
    const refillRate = requests / window; // Tokens per second
    const refillInterval = 1000; // Refill every second

    // Consume token atomically (refills and consumes in one operation)
    const result = await tokenBucketConsume(
      key,
      capacity,
      refillRate,
      refillInterval
    );

    if (result.allowed) {
      return {
        allowed: true,
        remaining: result.remaining,
        resetTime: result.resetTime,
        limit: capacity,
        algorithm: 'token-bucket',
      };
    }

    // No tokens available
    const retryAfter = Math.max(1, result.resetTime - Math.floor(Date.now() / 1000));

    return {
      allowed: false,
      remaining: 0,
      resetTime: result.resetTime,
      retryAfter,
      limit: capacity,
      algorithm: 'token-bucket',
    };
  }

  /**
   * Sliding Window Algorithm
   * Accurate request counting without fixed window boundaries
   */
  private async checkSlidingWindow(
    identifier: string,
    endpoint: string,
    requests: number,
    window: number
  ): Promise<RateLimitCheckResult> {
    const key = `ratelimit:sw:${identifier}:${endpoint}`;
    const result = await slidingWindowIncrement(key, window, requests);

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: result.retryAfter,
      limit: requests,
      algorithm: 'sliding-window',
    };
  }

  /**
   * Check rate limit with automatic tier detection
   */
  async check(
    endpoint: string,
    identifier: string,
    isAuthenticated: boolean,
    isPremium?: boolean
  ): Promise<RateLimitCheckResult> {
    const tier = getUserTier(isAuthenticated, isPremium);
    return this.checkRateLimit({
      endpoint,
      identifier,
      tier,
    });
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = new RateLimiter();

export default rateLimiter;
