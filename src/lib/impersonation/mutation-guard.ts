/** Cookie + path helpers with no Node crypto — safe for `src/proxy.ts` (Edge). */

export const IMPERSONATION_COOKIE = "caalm_impersonation";
export const IMPERSONATION_PATH_PREFIX = "/api/impersonation";

export const IMPERSONATION_READ_ONLY_ERROR =
	"View as user is read-only. End the session to make changes.";

export function isImpersonationControlPath(pathname: string): boolean {
	return (
		pathname === IMPERSONATION_PATH_PREFIX ||
		pathname.startsWith(`${IMPERSONATION_PATH_PREFIX}/`)
	);
}

export function hasImpersonationCookie(
	cookieValue: string | undefined,
): boolean {
	return Boolean(cookieValue?.includes("."));
}

/** True when a mutating API call should be blocked during Phase 1 impersonation. */
export function shouldBlockImpersonationMutation(
	method: string,
	pathname: string,
	hasActiveClaim: boolean,
): boolean {
	if (!hasActiveClaim) return false;
	const verb = method.toUpperCase();
	if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return false;
	if (isImpersonationControlPath(pathname)) return false;
	return pathname.startsWith("/api/");
}
