/**
 * Identifier extraction utilities
 * Extracts user ID, IP address, or API key from requests
 */

import type { NextRequest } from "next/server";

export interface RateLimitIdentifier {
	type: "user" | "api-key" | "ip";
	value: string;
	priority: number; // Higher priority = more specific identifier
}

/**
 * Extract IP address from request
 */
function extractIPAddress(request: NextRequest): string {
	// Check various headers for IP address
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		// x-forwarded-for can contain multiple IPs, take the first one
		const ips = forwarded.split(",").map((ip) => ip.trim());
		return ips[0] || "unknown";
	}

	const realIP = request.headers.get("x-real-ip");
	if (realIP) {
		return realIP;
	}

	const cfConnectingIP = request.headers.get("cf-connecting-ip");
	if (cfConnectingIP) {
		return cfConnectingIP;
	}

	// Fallback to connection remote address (if available)
	const remoteAddr = request.headers.get("remote-addr");
	if (remoteAddr) {
		return remoteAddr;
	}

	return "unknown";
}

/**
 * Extract API key from request
 */
function extractAPIKey(request: NextRequest): string | null {
	// Check Authorization header for Bearer token
	const authHeader = request.headers.get("authorization");
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.substring(7);
	}

	// Check x-api-key header
	const apiKey = request.headers.get("x-api-key");
	if (apiKey) {
		return apiKey;
	}

	// Check query parameter (less secure, but sometimes used)
	const queryKey = request.nextUrl.searchParams.get("api_key");
	if (queryKey) {
		return queryKey;
	}

	return null;
}

/**
 * Extract user ID from request (Edge-compatible)
 * Reads from session cookie without Node.js modules
 * Returns null if user is not authenticated
 */
function _extractUserID(request: NextRequest): string | null {
	// Try to extract user ID from session cookie
	// This is Edge-compatible and doesn't require Node.js modules
	const session = request.cookies.get("appwrite-session");

	if (!session?.value) {
		return null;
	}

	// For Edge Runtime, we can't parse the session directly
	// Instead, we'll use a lightweight approach: check if session exists
	// The actual user ID will be extracted in API routes where Node.js is available
	// For now, return null and rely on IP/API key identification in middleware
	return null;
}

/**
 * Extract rate limit identifier from request (Edge-compatible)
 * Priority: API Key > IP Address > Session (for user identification)
 * Note: Full user ID extraction requires Node.js runtime (done in API routes)
 */
export function extractRateLimitIdentifier(
	request: NextRequest,
): RateLimitIdentifier {
	// Try to get API key first (medium priority, works in Edge)
	const apiKey = extractAPIKey(request);
	if (apiKey) {
		return {
			type: "api-key",
			value: apiKey,
			priority: 2,
		};
	}

	// Try to get session-based identifier (for authenticated users)
	const session = request.cookies.get("appwrite-session");
	if (session?.value) {
		// Use a hash of the session as identifier (Edge-compatible)
		// This allows per-user rate limiting without parsing the session
		const sessionHash = session.value.substring(0, 16); // Use first 16 chars as identifier
		return {
			type: "user",
			value: `session:${sessionHash}`,
			priority: 3,
		};
	}

	// Fallback to IP address (lowest priority)
	const ipAddress = extractIPAddress(request);
	return {
		type: "ip",
		value: ipAddress,
		priority: 1,
	};
}

/**
 * Generate rate limit key from identifier and endpoint
 */
export function generateRateLimitKey(
	identifier: RateLimitIdentifier,
	endpoint: string,
): string {
	// Normalize endpoint (remove query params, trailing slashes)
	const normalizedEndpoint = endpoint
		.split("?")[0]
		.replace(/\/$/, "")
		.toLowerCase();

	// Create key based on identifier type
	const identifierKey = `${identifier.type}:${identifier.value}`;
	return `${identifierKey}:${normalizedEndpoint}`;
}

/**
 * Check if request should bypass rate limiting
 */
export function shouldBypassRateLimit(request: NextRequest): boolean {
	const pathname = request.nextUrl.pathname;

	// Health checks and system endpoints
	const bypassPatterns = [
		"/api/cache/health",
		"/api/admin/rate-limits",
		"/_next",
		"/favicon.ico",
	];

	return bypassPatterns.some((pattern) => pathname.startsWith(pattern));
}
