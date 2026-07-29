export function isAuthRoute(pathname: string | null | undefined): boolean {
	if (!pathname) return false;
	return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

/** Routes under `(root)` that should keep 2FA/session auth on client navigation */
export function isProtectedAppRoute(
	pathname: string | null | undefined,
): boolean {
	if (!pathname) return false;

	const protectedPrefixes = [
		"/dashboard",
		"/analytics",
		"/contracts",
		"/my-contracts",
		"/settings",
		"/search",
		"/licenses",
		"/uploads",
		"/images",
		"/media",
		"/others",
		"/documents",
		"/audits",
		"/team",
		"/calendar",
		"/company-news",
		"/shared",
		"/debug-role",
		"/test-notifications",
	];

	return protectedPrefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}
