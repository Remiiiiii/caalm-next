/**
 * Intentional API auth exceptions (not tech-debt gaps).
 * Every entry must exist under src/app/api and include a reason.
 */

export type ApiAuthzAllowClass =
	| "public"
	| "webhook"
	| "cron"
	| "oauth"
	| "token"
	| "health";

export type ApiAuthzAllowEntry = {
	/** Path relative to src/app/api (no leading slash, no route.ts) */
	path: string;
	class: ApiAuthzAllowClass;
	reason: string;
};

/**
 * Routes that are allowed to omit requirePermission/session checks
 * because they use another approved gate (or are intentionally public).
 */
export const API_AUTHZ_ALLOWLIST: readonly ApiAuthzAllowEntry[] = [
	{
		path: "coming-soon-signup",
		class: "public",
		reason: "Marketing waitlist signup; no authenticated session",
	},
	{
		path: "billing/webhooks",
		class: "webhook",
		reason: "Stripe signature verification (constructWebhookEvent)",
	},
	{
		path: "webhooks/github",
		class: "webhook",
		reason: "GitHub HMAC signature verification (X-Hub-Signature-256)",
	},
	{
		path: "roadmap/webhooks/ci-test-result",
		class: "webhook",
		reason:
			"Roadmap CI HMAC signature (X-Hub-Signature-256 / X-Roadmap-Signature)",
	},
	{
		path: "roadmap/webhooks/pr-merged",
		class: "webhook",
		reason:
			"Roadmap merge HMAC signature (GitHub pull_request.closed or slim payload)",
	},
	{
		path: "auth/callback/microsoft",
		class: "oauth",
		reason: "Microsoft OAuth redirect callback",
	},
	{
		path: "microsoft/callback",
		class: "oauth",
		reason: "Microsoft OAuth redirect callback",
	},
	{
		path: "microsoft/auth",
		class: "oauth",
		reason: "Starts Microsoft OAuth authorize redirect",
	},
	{
		path: "hubspot/auth",
		class: "oauth",
		reason: "Starts HubSpot OAuth authorize redirect",
	},
	{
		path: "hubspot/callback",
		class: "oauth",
		reason: "HubSpot OAuth redirect callback",
	},
	{
		path: "webhooks/hubspot",
		class: "webhook",
		reason: "HubSpot HMAC signature verification (X-HubSpot-Signature-v3)",
	},
	{
		path: "auth/send-otp",
		class: "public",
		reason: "Pre-auth OTP send during sign-in",
	},
	{
		path: "auth/verify-otp",
		class: "public",
		reason: "Pre-auth OTP verify during sign-in",
	},
	{
		path: "verify-otp",
		class: "public",
		reason: "Legacy pre-auth OTP verify path",
	},
	{
		path: "auth/logout",
		class: "public",
		reason: "Clears session cookies; safe without prior permission check",
	},
	{
		path: "invite/accept",
		class: "token",
		reason: "Invitation acceptance via invite token",
	},
	{
		path: "invitations/[token]/resend",
		class: "token",
		reason: "Invitation token-scoped action",
	},
	{
		path: "cache/health",
		class: "health",
		reason: "Infrastructure health probe",
	},
	{
		path: "docs/search",
		class: "public",
		reason: "Public documentation search index",
	},
	{
		path: "weather",
		class: "public",
		reason: "Public weather widget proxy",
	},
	{
		path: "sms-form-submission",
		class: "public",
		reason: "Public SMS lead/intake form endpoint",
	},
	{
		path: "demo/session",
		class: "public",
		reason: "Demo sandbox session bootstrap",
	},
	{
		path: "test/e2e-preflight",
		class: "health",
		reason:
			"Playwright/CI preflight only: returns 404 outside CI, PLAYWRIGHT_TEST, or development; read-only Appwrite RBAC checks",
	},
	{
		path: "negotiate/[token]",
		class: "token",
		reason:
			"Counterparty negotiation view via hashed invite token + OTP session",
	},
	{
		path: "negotiate/[token]/comments",
		class: "token",
		reason: "Counterparty comment via hashed invite token + OTP session",
	},
	{
		path: "negotiate/[token]/session",
		class: "token",
		reason: "Check negotiate OTP session cookie for counterparty gate",
	},
	{
		path: "negotiate/[token]/verify/request",
		class: "token",
		reason: "Send OTP to allowlisted negotiate invitee email",
	},
	{
		path: "negotiate/[token]/verify/confirm",
		class: "token",
		reason: "Confirm OTP and set httpOnly negotiate session cookie",
	},
	{
		path: "esign/webhooks",
		class: "webhook",
		reason: "CAALM Execute HMAC signature (X-Esign-Signature)",
	},
	{
		path: "esign/sign/[token]",
		class: "token",
		reason: "Public recipient signing via HMAC token",
	},
	{
		path: "esign/sign/[token]/document",
		class: "token",
		reason: "Public recipient PDF preview/download via HMAC token",
	},
] as const;

export const API_AUTHZ_ALLOWLIST_PATHS = new Set(
	API_AUTHZ_ALLOWLIST.map((e) => e.path),
);
