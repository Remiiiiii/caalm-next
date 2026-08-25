/**
 * Rate limit configuration
 * Centralized configuration for endpoint-specific rate limits
 */

export type UserTier = "anonymous" | "authenticated" | "premium";

export interface RateLimitConfig {
	requests: number;
	window: number; // in seconds
	burst?: number; // optional burst capacity (for token bucket)
}

export interface EndpointRateLimit {
	anonymous?: RateLimitConfig;
	authenticated?: RateLimitConfig;
	premium?: RateLimitConfig;
	default?: RateLimitConfig; // fallback if tier not specified
}

/**
 * Rate limit configuration map
 * Keys are endpoint patterns (regex strings)
 * Values are tier-based rate limits
 */
export const RATE_LIMIT_CONFIG: Record<string, EndpointRateLimit> = {
	// Authentication endpoints - strict limits to prevent brute force
	"^/api/auth/(send-otp|verify-otp)$": {
		anonymous: { requests: 5, window: 60, burst: 10 },
		authenticated: { requests: 10, window: 60, burst: 20 },
	},
	"^/api/auth/(session|logout)$": {
		authenticated: { requests: 30, window: 60 },
	},
	"^/api/2fa/(setup|verify|status)$": {
		authenticated: { requests: 10, window: 60, burst: 15 },
	},

	// High-cost operations - AI analysis, PDF processing
	"^/api/ai-analyze$": {
		anonymous: { requests: 0, window: 60 },
		authenticated: { requests: 20, window: 60, burst: 30 },
		premium: { requests: 100, window: 60, burst: 150 },
	},
	"^/api/contract-analysis$": {
		anonymous: { requests: 0, window: 60 },
		authenticated: { requests: 20, window: 60, burst: 30 },
		premium: { requests: 100, window: 60, burst: 150 },
	},
	"^/api/(extract-pdf-text|upload-pdf)$": {
		anonymous: { requests: 0, window: 60 },
		authenticated: { requests: 30, window: 60, burst: 50 },
		premium: { requests: 150, window: 60, burst: 200 },
	},
	"^/api/contracts/(extract-data|process-draft)$": {
		anonymous: { requests: 0, window: 60 },
		authenticated: { requests: 30, window: 60, burst: 50 },
		premium: { requests: 150, window: 60, burst: 200 },
	},
	"^/api/licenses/extract-data$": {
		anonymous: { requests: 0, window: 60 },
		authenticated: { requests: 30, window: 60, burst: 50 },
		premium: { requests: 150, window: 60, burst: 200 },
	},

	// Read-heavy endpoints - dashboard, analytics
	"^/api/dashboard/(unified|stats)$": {
		authenticated: { requests: 100, window: 60, burst: 150 },
		premium: { requests: 500, window: 60, burst: 750 },
	},
	"^/api/analytics/": {
		authenticated: { requests: 100, window: 60, burst: 150 },
		premium: { requests: 500, window: 60, burst: 750 },
	},
	"^/api/recent-activities": {
		authenticated: { requests: 200, window: 60, burst: 300 },
	},
	"^/api/search/(quick|recent|saved)$": {
		authenticated: { requests: 150, window: 60, burst: 200 },
		premium: { requests: 500, window: 60, burst: 750 },
	},

	// Write operations - create, update, delete
	"^/api/contracts$": {
		authenticated: { requests: 50, window: 60, burst: 75 },
		premium: { requests: 200, window: 60, burst: 300 },
	},
	"^/api/files/upload$": {
		authenticated: { requests: 30, window: 60, burst: 50 },
		premium: { requests: 150, window: 60, burst: 200 },
	},
	"^/api/invitations$": {
		authenticated: { requests: 20, window: 60, burst: 30 },
	},
	"^/api/invite$": {
		authenticated: { requests: 20, window: 60, burst: 30 },
	},
	"^/api/users$": {
		authenticated: { requests: 50, window: 60, burst: 75 },
	},
	"^/api/notifications$": {
		authenticated: { requests: 100, window: 60, burst: 150 },
	},

	// Calendar operations
	"^/api/calendar/": {
		authenticated: { requests: 100, window: 60, burst: 150 },
		premium: { requests: 300, window: 60, burst: 450 },
	},
	"^/api/microsoft/calendar/": {
		authenticated: { requests: 50, window: 60, burst: 75 },
	},

	// Admin endpoints - stricter limits
	"^/api/admin/": {
		authenticated: { requests: 50, window: 60, burst: 75 },
	},

	// Notification endpoints
	"^/api/notification-": {
		authenticated: { requests: 100, window: 60, burst: 150 },
	},

	// SAM.gov integration
	"^/api/sam/": {
		authenticated: { requests: 50, window: 60, burst: 75 },
	},

	// AI Image Generation - strict limits to control costs
	"^/api/ai-image-generate$": {
		anonymous: { requests: 0, window: 3600 }, // No anonymous access
		authenticated: { requests: 10, window: 3600, burst: 15 }, // 10 per hour
		premium: { requests: 50, window: 3600, burst: 75 }, // 50 per hour for premium
	},
};

/**
 * Default rate limit configuration
 * Applied to endpoints not explicitly configured
 */
export const DEFAULT_RATE_LIMIT: EndpointRateLimit = {
	anonymous: { requests: 10, window: 60, burst: 15 },
	authenticated: { requests: 100, window: 60, burst: 150 },
	premium: { requests: 500, window: 60, burst: 750 },
	default: { requests: 50, window: 60, burst: 75 },
};

/**
 * Get rate limit configuration for an endpoint
 */
export function getRateLimitConfig(
	endpoint: string,
	tier: UserTier,
): RateLimitConfig {
	// Find matching configuration
	for (const [pattern, config] of Object.entries(RATE_LIMIT_CONFIG)) {
		const regex = new RegExp(pattern);
		if (regex.test(endpoint)) {
			// Return tier-specific config or default
			return (
				config[tier] ||
				config.default ||
				DEFAULT_RATE_LIMIT[tier] ||
				DEFAULT_RATE_LIMIT.default!
			);
		}
	}

	// Return default configuration
	return (
		DEFAULT_RATE_LIMIT[tier] ||
		DEFAULT_RATE_LIMIT.default ||
		DEFAULT_RATE_LIMIT.authenticated!
	);
}

/**
 * Check if endpoint should bypass rate limiting
 */
export function shouldBypassRateLimit(endpoint: string): boolean {
	const bypassPatterns = [
		"^/api/cache/health$",
		"^/api/admin/rate-limits/", // Rate limit metrics endpoint
		"^/api/roadmap/webhooks/", // HMAC-signed CI callbacks — not public traffic
		"^/_next/",
		"^/favicon.ico$",
	];

	return bypassPatterns.some((pattern) => {
		const regex = new RegExp(pattern);
		return regex.test(endpoint);
	});
}

/**
 * Get user tier from user data
 * TODO: Integrate with actual user subscription/premium status
 */
export function getUserTier(
	isAuthenticated: boolean,
	isPremium?: boolean,
): UserTier {
	if (!isAuthenticated) return "anonymous";
	if (isPremium) return "premium";
	return "authenticated";
}
