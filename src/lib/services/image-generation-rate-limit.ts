"use server";

interface RateLimitRecord {
	userId: string;
	count: number;
	resetAt: number;
}

// In-memory cache for rate limiting (simple implementation)
// In production, consider using Redis for distributed rate limiting
const rateLimitCache = new Map<string, RateLimitRecord>();

const RATE_LIMIT_WINDOW = 3600 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per hour per user

/**
 * Check if user has exceeded rate limit for image generation
 * @param userId - User ID
 * @returns Object with allowed status and remaining requests
 */
export async function checkImageGenerationRateLimit(
	userId: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const now = Date.now();
	const cacheKey = `img-gen:${userId}`;

	// Get or create rate limit record
	let record = rateLimitCache.get(cacheKey);

	// Check if record exists and is still valid
	if (record && record.resetAt > now) {
		// Within the window
		if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
			return {
				allowed: false,
				remaining: 0,
				resetAt: record.resetAt,
			};
		}

		// Increment count
		record.count += 1;
		rateLimitCache.set(cacheKey, record);

		return {
			allowed: true,
			remaining: RATE_LIMIT_MAX_REQUESTS - record.count,
			resetAt: record.resetAt,
		};
	}

	// Create new record or reset expired one
	record = {
		userId,
		count: 1,
		resetAt: now + RATE_LIMIT_WINDOW,
	};
	rateLimitCache.set(cacheKey, record);

	// Clean up expired entries periodically (simple cleanup)
	if (rateLimitCache.size > 1000) {
		for (const [key, value] of rateLimitCache.entries()) {
			if (value.resetAt <= now) {
				rateLimitCache.delete(key);
			}
		}
	}

	return {
		allowed: true,
		remaining: RATE_LIMIT_MAX_REQUESTS - 1,
		resetAt: record.resetAt,
	};
}

/**
 * Get rate limit status for a user
 */
export async function getImageGenerationRateLimitStatus(
	userId: string,
): Promise<{ remaining: number; resetAt: number; limit: number }> {
	const cacheKey = `img-gen:${userId}`;
	const record = rateLimitCache.get(cacheKey);
	const now = Date.now();

	if (!record || record.resetAt <= now) {
		return {
			remaining: RATE_LIMIT_MAX_REQUESTS,
			resetAt: now + RATE_LIMIT_WINDOW,
			limit: RATE_LIMIT_MAX_REQUESTS,
		};
	}

	return {
		remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count),
		resetAt: record.resetAt,
		limit: RATE_LIMIT_MAX_REQUESTS,
	};
}
