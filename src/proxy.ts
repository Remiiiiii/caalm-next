import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
	extractRateLimitIdentifier,
	shouldBypassRateLimit,
} from "@/lib/api/rate-limit/identifier.util";
import {
	addRateLimitHeaders,
	createRateLimitResponse,
} from "@/lib/api/rate-limit/response.util";
import {
	getUserTier,
	shouldBypassRateLimit as shouldBypassConfig,
} from "@/lib/config/rate-limit.config";
import { rateLimitMonitoring } from "@/lib/services/rate-limit-monitoring";
import { rateLimiter } from "@/lib/services/rate-limiter";
import { penaltyService } from "@/lib/services/rate-limiter-penalties";

// Check if rate limiting is enabled
const RATE_LIMIT_ENABLED =
	process.env.RATE_LIMIT_ENABLED !== "false" &&
	process.env.NODE_ENV === "production";

// Log mode: log violations without blocking
const RATE_LIMIT_LOG_MODE = process.env.RATE_LIMIT_LOG_MODE === "true";

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Rate limiting for API routes (Edge-compatible)
	if (pathname.startsWith("/api")) {
		// Check if rate limiting is enabled
		if (RATE_LIMIT_ENABLED || RATE_LIMIT_LOG_MODE) {
			// Check if endpoint should bypass rate limiting
			if (!shouldBypassRateLimit(request) && !shouldBypassConfig(pathname)) {
				try {
					// Extract identifier (Edge-compatible - no Node.js modules)
					const identifier = extractRateLimitIdentifier(request);

					// Determine authentication status from cookies (Edge-compatible)
					const session = request.cookies.get("appwrite-session");
					const isAuthenticated = !!session?.value;
					const isPremium = false; // TODO: Check premium status from cookie if available

					// Check rate limit
					const startTime = Date.now();
					const result = await rateLimiter.check(
						pathname,
						identifier.value,
						isAuthenticated,
						isPremium,
					);
					const latency = Date.now() - startTime;

					// Record check for monitoring (async, don't block)
					rateLimitMonitoring
						.recordCheck(pathname, identifier.value, result.allowed, latency)
						.catch((error) => {
							console.error("Error recording rate limit check:", error);
						});

					// Log rate limit check (for monitoring)
					if (process.env.NODE_ENV === "development" || RATE_LIMIT_LOG_MODE) {
						console.log(
							`[Rate Limit] ${pathname} - ${identifier.type}:${identifier.value} - Allowed: ${result.allowed}, Remaining: ${result.remaining}, Latency: ${latency}ms`,
						);
					}

					// If rate limit exceeded
					if (!result.allowed) {
						// Record violation for progressive penalties (async)
						const tier = getUserTier(isAuthenticated, isPremium);
						penaltyService
							.recordViolation(identifier.value, pathname, tier)
							.catch((error) => {
								console.error("Error recording violation:", error);
							});

						// Log violation for monitoring (async)
						rateLimitMonitoring
							.logViolation({
								timestamp: Date.now(),
								endpoint: pathname,
								identifier: identifier.value,
								identifierType: identifier.type,
								tier,
								limit: result.limit,
								remaining: result.remaining,
								retryAfter: result.retryAfter,
							})
							.catch((error) => {
								console.error("Error logging violation:", error);
							});

						if (RATE_LIMIT_LOG_MODE) {
							// In log mode, allow the request but log it
							console.warn(
								`[Rate Limit Violation] ${pathname} - ${identifier.type}:${identifier.value} - Would be blocked`,
							);
						} else {
							// Return rate limit error response
							return createRateLimitResponse(
								result,
								`Rate limit exceeded for ${pathname}. Please try again in ${result.retryAfter} seconds.`,
							);
						}
					} else {
						// Request allowed - add rate limit headers to response
						const response = NextResponse.next();
						addRateLimitHeaders(response, result);
						return response;
					}
				} catch (error) {
					// On error, log and allow request (fail open)
					console.error("[Rate Limit Error]", error);
				}
			}
		}
	}

	// Coming Soon Mode - redirect to coming soon page in production
	if (
		process.env.NODE_ENV === "production" &&
		process.env.SHOW_COMING_SOON === "true" &&
		pathname !== "/coming-soon" &&
		!pathname.startsWith("/api") &&
		!pathname.startsWith("/_next") &&
		!pathname.startsWith("/assets") &&
		!pathname.startsWith("/favicon.ico")
	) {
		return NextResponse.redirect(new URL("/coming-soon", request.url));
	}

	// Public routes that should never require auth
	const publicPaths = [
		"/",
		"/sign-in",
		"/sign-up",
		"/terms",
		"/privacy",
		"/coming-soon",
	];

	// Static and system paths to always allow
	const systemPathPrefixes = ["/api", "/_next", "/favicon.ico", "/assets"];

	if (
		publicPaths.includes(pathname) ||
		systemPathPrefixes.some((p) => pathname.startsWith(p))
	) {
		return NextResponse.next();
	}

	// Check for logout reason cookie
	const logoutReason = request.cookies.get("logout_reason");
	if (logoutReason?.value === "inactivity") {
		// Clear the cookie and redirect to sign-in with message
		const response = NextResponse.redirect(
			new URL("/sign-in?reason=inactivity", request.url),
		);
		response.cookies.delete("logout_reason");
		return response;
	}

	// Define protected route prefixes
	const protectedPrefixes = [
		"/dashboard",
		"/contracts",
		"/licenses",
		"/analytics",
		"/uploads",
		"/images",
		"/media",
		"/others",
		"/audits",
		"/team",
	];

	const isProtectedPath = protectedPrefixes.some((p) => pathname.startsWith(p));

	// Dashboard route protection - check role-based access for all dashboard routes
	if (pathname.startsWith("/dashboard")) {
		const { redirectIfNotAuthorizedForDashboard } = await import(
			"@/lib/auth/dashboard-guards"
		);
		const dashboardCheck = await redirectIfNotAuthorizedForDashboard(request);
		if (dashboardCheck) {
			return dashboardCheck;
		}
	}

	if (isProtectedPath) {
		const hasCompleted2FA = request.cookies.get("2fa_completed");
		const session = request.cookies.get("appwrite-session");

		// If user has completed 2FA, allow access even without traditional session
		if (hasCompleted2FA?.value === "true") {
			return NextResponse.next();
		}

		// If no session exists, redirect to sign-in
		if (!session?.value) {
			return NextResponse.redirect(new URL("/sign-in", request.url));
		}

		// If user hasn't completed 2FA and is trying to access protected routes
		if (!hasCompleted2FA) {
			// Redirect to settings to complete 2FA setup
			return NextResponse.redirect(new URL("/settings", request.url));
		}

		// Validate session for protected routes
		try {
			// Validate session by calling our session validation endpoint
			const sessionValidationUrl = new URL("/api/auth/session", request.url);
			const sessionResponse = await fetch(sessionValidationUrl, {
				headers: {
					Cookie: request.headers.get("cookie") || "",
				},
			});

			if (!sessionResponse.ok) {
				// Session is invalid, redirect to sign-in
				return NextResponse.redirect(
					new URL("/sign-in?reason=session_expired", request.url),
				);
			}
		} catch (error) {
			console.error("Session validation error in proxy:", error);
			// On error, redirect to sign-in to be safe
			return NextResponse.redirect(
				new URL("/sign-in?reason=validation_error", request.url),
			);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Note: API routes are now included for rate limiting
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
};
