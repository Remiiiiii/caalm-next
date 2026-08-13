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
		path: "invitations/[token]/delete",
		class: "token",
		reason: "Invitation token-scoped action",
	},
	{
		path: "invitations/[token]/resend",
		class: "token",
		reason: "Invitation token-scoped action",
	},
	{
		path: "invitations/[token]/revoke",
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
] as const;

export const API_AUTHZ_ALLOWLIST_PATHS = new Set(
	API_AUTHZ_ALLOWLIST.map((e) => e.path),
);
