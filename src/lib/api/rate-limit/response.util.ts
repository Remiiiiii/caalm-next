/**
 * Rate limit response utilities
 * Standardized HTTP 429 responses with proper headers
 */

import { NextResponse } from "next/server";
import type { RateLimitCheckResult } from "@/lib/services/rate-limiter";

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(
	result: RateLimitCheckResult,
	message?: string,
): NextResponse {
	const retryAfter =
		result.retryAfter || result.resetTime - Math.floor(Date.now() / 1000);
	const resetTime = new Date(result.resetTime * 1000).toISOString();

	const response = NextResponse.json(
		{
			error: "Rate limit exceeded",
			message:
				message ||
				`Too many requests. Please try again after ${retryAfter} seconds.`,
			retryAfter,
			resetTime,
		},
		{ status: 429 },
	);

	// Set standard rate limit headers
	response.headers.set("X-RateLimit-Limit", result.limit.toString());
	response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
	response.headers.set("X-RateLimit-Reset", result.resetTime.toString());
	response.headers.set("Retry-After", retryAfter.toString());
	response.headers.set("X-RateLimit-Algorithm", result.algorithm);

	return response;
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
	response: NextResponse,
	result: RateLimitCheckResult,
): NextResponse {
	response.headers.set("X-RateLimit-Limit", result.limit.toString());
	response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
	response.headers.set("X-RateLimit-Reset", result.resetTime.toString());
	response.headers.set("X-RateLimit-Algorithm", result.algorithm);

	return response;
}

/**
 * Create rate limit error response with custom message
 */
export function rateLimitError(
	result: RateLimitCheckResult,
	customMessage?: string,
): NextResponse {
	return createRateLimitResponse(result, customMessage);
}
