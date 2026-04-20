/**
 * Unit tests for rate limiting algorithms
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "@/lib/services/rate-limiter";
import {
	slidingWindowIncrement,
	tokenBucketConsume,
} from "@/lib/services/redis-rate-limit";

// Mock Redis operations
vi.mock("@/lib/services/redis-rate-limit", () => ({
	tokenBucketRefill: vi.fn(),
	tokenBucketConsume: vi.fn(),
	slidingWindowIncrement: vi.fn(),
	isBanned: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/config/rate-limit.config", () => ({
	getRateLimitConfig: vi.fn((_endpoint: string, _tier: string) => ({
		requests: 100,
		window: 60,
		burst: 200,
	})),
	getUserTier: vi.fn((isAuthenticated: boolean, isPremium?: boolean) => {
		if (!isAuthenticated) return "anonymous";
		if (isPremium) return "premium";
		return "authenticated";
	}),
}));

describe("RateLimiter", () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter();
		vi.clearAllMocks();
	});

	describe("Token Bucket Algorithm", () => {
		it("should allow requests when tokens are available", async () => {
			const mockTokenBucketConsume = tokenBucketConsume as any;
			mockTokenBucketConsume.mockResolvedValue({
				allowed: true,
				remaining: 10,
				resetTime: Math.floor(Date.now() / 1000) + 60,
			});

			const result = await rateLimiter.checkRateLimit({
				endpoint: "/api/test",
				identifier: "test-user",
				tier: "authenticated",
				useTokenBucket: true,
				useSlidingWindow: false,
			});

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBeGreaterThan(0);
		});

		it("should deny requests when no tokens available", async () => {
			const mockTokenBucketConsume = tokenBucketConsume as any;
			mockTokenBucketConsume.mockResolvedValue({
				allowed: false,
				remaining: 0,
				resetTime: Math.floor(Date.now() / 1000) + 60,
			});

			const result = await rateLimiter.checkRateLimit({
				endpoint: "/api/test",
				identifier: "test-user",
				tier: "authenticated",
				useTokenBucket: true,
				useSlidingWindow: false,
			});

			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it("should refill tokens over time", async () => {
			const mockTokenBucketConsume = tokenBucketConsume as any;

			// Initial state: no tokens
			mockTokenBucketConsume.mockResolvedValueOnce({
				allowed: false,
				remaining: 0,
				resetTime: Math.floor(Date.now() / 1000) + 60,
			});

			// After refill: should have tokens
			mockTokenBucketConsume.mockResolvedValueOnce({
				allowed: true,
				remaining: 5,
				resetTime: Math.floor(Date.now() / 1000) + 60,
			});

			const result1 = await rateLimiter.checkRateLimit({
				endpoint: "/api/test",
				identifier: "test-user",
				tier: "authenticated",
				useTokenBucket: true,
				useSlidingWindow: false,
			});

			expect(result1.allowed).toBe(false);

			// Wait a bit and check again
			const result2 = await rateLimiter.checkRateLimit({
				endpoint: "/api/test",
				identifier: "test-user",
				tier: "authenticated",
				useTokenBucket: true,
				useSlidingWindow: false,
			});

			expect(result2.allowed).toBe(true);
		});
	});

	describe("Sliding Window Algorithm", () => {
		it("should allow requests within limit", async () => {
			const mockSlidingWindowIncrement = slidingWindowIncrement as any;
			mockSlidingWindowIncrement.mockResolvedValue({
				allowed: true,
				remaining: 50,
				resetTime: Math.floor(Date.now() / 1000) + 60,
			});

			const result = await rateLimiter.checkRateLimit({
				endpoint: "/api/test",
				identifier: "test-user",
				tier: "authenticated",
				useTokenBucket: false,
				useSlidingWindow: true,
			});

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(50);
		});

		it("should deny requests exceeding limit", async () => {
			const mockSlidingWindowIncrement = slidingWindowIncrement as any;
			mockSlidingWindowIncrement.mockResolvedValue({
				allowed: false,
				remaining: 0,
				resetTime: Math.floor(Date.now() / 1000) + 60,
				retryAfter: 60,
			});

			const result = await rateLimiter.checkRateLimit({
				endpoint: "/api/test",
				identifier: "test-user",
				tier: "authenticated",
				useTokenBucket: false,
				useSlidingWindow: true,
			});

			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
			expect(result.retryAfter).toBe(60);
		});
	});

	describe("Hybrid Approach", () => {
		it("should use both algorithms and take most restrictive result", async () => {
			const mockTokenBucketConsume = tokenBucketConsume as any;
			const mockSlidingWindowIncrement = slidingWindowIncrement as any;

			// Token bucket allows
			mockTokenBucketConsume.mockResolvedValue({
				allowed: true,
				remaining: 10,
				resetTime: Math.floor(Date.now() / 1000) + 60,
			});

			// Sliding window denies
			mockSlidingWindowIncrement.mockResolvedValue({
				allowed: false,
				remaining: 0,
				resetTime: Math.floor(Date.now() / 1000) + 60,
				retryAfter: 60,
			});

			const result = await rateLimiter.checkRateLimit({
				endpoint: "/api/test",
				identifier: "test-user",
				tier: "authenticated",
				useTokenBucket: true,
				useSlidingWindow: true,
			});

			// Should deny (most restrictive)
			expect(result.allowed).toBe(false);
		});
	});
});
