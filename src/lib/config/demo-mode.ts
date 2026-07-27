/**
 * Demo mode configuration — isolated sandbox deployments only.
 * Never enable APP_MODE=demo against the production database.
 */

/** Known production / caalm-dev database ID — demo mode must never use this. */
export const PROD_APPWRITE_DATABASE_ID =
	process.env.PROD_APPWRITE_DATABASE_ID || "685ed87c0009d8189fc7";

export function isDemoMode(): boolean {
	return (
		process.env.APP_MODE === "demo" ||
		process.env.NEXT_PUBLIC_APP_MODE === "demo"
	);
}

export function getDemoOtpCode(): string {
	return process.env.DEMO_OTP_CODE || "123456";
}

export function getDemoOrgTtlDays(): number {
	const raw = process.env.DEMO_ORG_TTL_DAYS;
	const parsed = raw ? Number.parseInt(raw, 10) : 7;
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

export function getDemoOrgExpiresAt(from: Date = new Date()): string {
	const expires = new Date(from);
	expires.setDate(expires.getDate() + getDemoOrgTtlDays());
	return expires.toISOString();
}

/**
 * Throws if demo mode is enabled while pointed at the production database.
 * Call from server boot / demo provisioning paths.
 */
export function assertDemoNotUsingProdDatabase(): void {
	if (!isDemoMode()) return;

	const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE || "";
	if (!databaseId) {
		throw new Error(
			"APP_MODE=demo requires NEXT_PUBLIC_APPWRITE_DATABASE to be set to the caalm-demo database ID.",
		);
	}

	if (databaseId === PROD_APPWRITE_DATABASE_ID) {
		throw new Error(
			"APP_MODE=demo refused: NEXT_PUBLIC_APPWRITE_DATABASE points at production (caalm-dev). Use the caalm-demo database ID instead.",
		);
	}
}
