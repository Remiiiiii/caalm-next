/** Exact paths that stay public (marketing / legal / demos). */
const PUBLIC_EXACT_PATHS = new Set([
	"/",
	"/terms",
	"/privacy",
	"/coming-soon",
	"/try",
	"/help",
	"/contact",
]);

/** Prefixes for token/counterparty flows and docs — never run app-shell 2FA auth. */
const PUBLIC_ROUTE_PREFIXES = [
	"/sign-in",
	"/sign-up",
	"/negotiate/",
	"/approve/",
	"/invite/",
	"/sign/",
	"/docs",
] as const;

export function isAuthRoute(pathname: string | null | undefined): boolean {
	if (!pathname) return false;
	return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

function isPublicAppPath(pathname: string): boolean {
	if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
	return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * App-shell routes (under `src/app/(root)/`) must be "protected" so AuthContext
 * keeps the 2FA/session user on client navigations. Unlisted paths used to
 * clear the user and send people to /sign-in even while logged in.
 *
 * Default: protect everything except known public/marketing/counterparty paths.
 */
export function isProtectedAppRoute(
	pathname: string | null | undefined,
): boolean {
	if (!pathname) return false;
	if (isAuthRoute(pathname)) return false;
	if (isPublicAppPath(pathname)) return false;
	return true;
}

/** Edge proxy session/2FA gate — same rule as client AuthContext. */
export function isProxyProtectedPath(pathname: string): boolean {
	return isProtectedAppRoute(pathname);
}
