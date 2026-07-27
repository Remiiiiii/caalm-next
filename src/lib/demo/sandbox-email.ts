/**
 * Client-side helpers for unique per-visitor demo sandbox emails.
 * Stored in localStorage so "Sign in to existing sandbox" can resume within TTL.
 */

export const DEMO_SANDBOX_EMAIL_STORAGE_KEY = "caalm_demo_sandbox_email";

export function createUniqueDemoEmail(): string {
	const id =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
			: Math.random().toString(36).slice(2, 12);
	return `sandbox-${id}@caalm.demo`;
}

export function getStoredDemoSandboxEmail(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(DEMO_SANDBOX_EMAIL_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function saveDemoSandboxEmail(email: string): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(DEMO_SANDBOX_EMAIL_STORAGE_KEY, email);
	} catch {
		// ignore quota / private mode
	}
}
