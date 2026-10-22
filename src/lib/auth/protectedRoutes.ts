/**
 * Metadata routes search engines (and the readiness public-site crawl) fetch
 * unauthenticated — src/app/sitemap.ts and src/app/robots.ts. Exported so the
 * proxy's Coming Soon redirect can exempt them too, without a second
 * hardcoded copy of these two paths drifting from this one.
 */
export const CRAWLER_PATHS = ["/sitemap.xml", "/robots.txt"] as const;

/** Exact paths that stay public (marketing / legal / demos). */
export const PUBLIC_EXACT_PATHS = new Set<string>([
	"/",
	"/terms",
	"/privacy",
	"/coming-soon",
	"/try",
	"/help",
	"/contact",
	"/request-a-demo",
	"/nonprofits",
	...CRAWLER_PATHS,
]);

/** Prefixes for token/counterparty flows and docs — never run app-shell 2FA auth. */
export const PUBLIC_ROUTE_PREFIXES = [
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
