/**
 * Integration tests for rate limiting middleware
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/services/rate-limiter", () => ({
	rateLimiter: {
		check: vi.fn(),
	},
}));

vi.mock("@/lib/api/rate-limit/identifier.util", () => ({
	extractRateLimitIdentifier: vi.fn(() => ({
		type: "ip",
		value: "127.0.0.1",
		priority: 1,
	})),
	shouldBypassRateLimit: vi.fn(() => false),
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/services/rate-limiter-penalties", () => ({
	penaltyService: {
		recordViolation: vi.fn(() => Promise.resolve()),
	},
}));

vi.mock("@/lib/services/rate-limit-monitoring", () => ({
	rateLimitMonitoring: {
		recordCheck: vi.fn(() => Promise.resolve()),
		logViolation: vi.fn(() => Promise.resolve()),
	},
}));

describe("Rate Limit Middleware", () => {
	let middleware: (request: NextRequest) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Set environment variables before importing middleware
		process.env.RATE_LIMIT_ENABLED = "true";
		process.env.NODE_ENV = "production";
		// Re-import middleware to pick up new env vars
		const proxyModule = await import("@/proxy");
		middleware = proxyModule.proxy;
	});

	afterEach(() => {
		vi.resetModules();
	});

	it("should bypass non-API routes", async () => {
		const request = new NextRequest(new URL("http://localhost:3000/dashboard"));
		const response = await middleware(request);

		// Should pass through without rate limiting
		expect(response).toBeDefined();
	});

	it("should apply rate limiting to API routes", async () => {
		const { extractRateLimitIdentifier } = await import(
			"@/lib/api/rate-limit/identifier.util"
		);
		const { rateLimiter } = await import("@/lib/services/rate-limiter");
		const { getCurrentUser } = await import("@/lib/actions/user.actions");

		(extractRateLimitIdentifier as any).mockResolvedValue({
			type: "ip",
			value: "127.0.0.1",
			priority: 1,
		});

		(getCurrentUser as any).mockResolvedValue(null);

		(rateLimiter.check as any).mockResolvedValue({
			allowed: true,
			remaining: 99,
			resetTime: Math.floor(Date.now() / 1000) + 60,
			limit: 100,
			algorithm: "token-bucket",
		});

		const request = new NextRequest(new URL("http://localhost:3000/api/test"));
		const response = await middleware(request);

		expect(response).toBeDefined();
		expect(rateLimiter.check).toHaveBeenCalled();
	});

	it("should return 429 when rate limit exceeded", async () => {
		const { extractRateLimitIdentifier } = await import(
			"@/lib/api/rate-limit/identifier.util"
		);
		const { rateLimiter } = await import("@/lib/services/rate-limiter");
		const { getCurrentUser } = await import("@/lib/actions/user.actions");

		(extractRateLimitIdentifier as any).mockResolvedValue({
			type: "ip",
			value: "127.0.0.1",
			priority: 1,
		});

		(getCurrentUser as any).mockResolvedValue(null);

		(rateLimiter.check as any).mockResolvedValue({
			allowed: false,
			remaining: 0,
			resetTime: Math.floor(Date.now() / 1000) + 60,
			retryAfter: 60,
			limit: 100,
			algorithm: "token-bucket",
		});

		const request = new NextRequest(new URL("http://localhost:3000/api/test"));
		const response = await middleware(request);

		expect(response.status).toBe(429);
		const json = await response.json();
		expect(json.error).toBe("Rate limit exceeded");
	});

	it("should bypass health check endpoints", async () => {
		const { shouldBypassRateLimit } = await import(
			"@/lib/api/rate-limit/identifier.util"
		);

		(shouldBypassRateLimit as any).mockReturnValue(true);

		const request = new NextRequest(
			new URL("http://localhost:3000/api/cache/health"),
		);
		const response = await middleware(request);

		expect(response).toBeDefined();
	});
});
