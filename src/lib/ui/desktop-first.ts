/** Full authenticated UI starts at Tailwind `lg`. */
export const DESKTOP_MIN_WIDTH = 1024;

/**
 * Phone-width routes that still render. Everything else under the
 * authenticated app needs a laptop.
 */
export const COMPANION_PATH_PREFIXES = [
	"/dashboard",
	"/contracts/approvals",
	"/licenses/approvals",
	"/tickets",
	"/team/tasks",
	"/company-news",
	"/approve",
] as const;

/** Dense trees under an otherwise companion prefix (IT portal, admin tools). */
export const DESKTOP_OVERRIDE_PREFIXES = [
	"/dashboard/it",
	"/dashboard/admin/roles",
	"/dashboard/admin/rate-limits",
	"/dashboard/user-management",
] as const;

function normalizePath(pathname: string): string {
	if (!pathname) return "/";
	const trimmed = pathname.split("?")[0].split("#")[0];
	if (trimmed.length > 1 && trimmed.endsWith("/")) {
		return trimmed.slice(0, -1);
	}
	return trimmed || "/";
}

function matchesPrefix(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isCompanionPath(pathname: string): boolean {
	const path = normalizePath(pathname);
	if (DESKTOP_OVERRIDE_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) {
		return false;
	}
	return COMPANION_PATH_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

/** Authenticated app default: desktop-required unless companion. */
export function isDesktopRequiredPath(pathname: string): boolean {
	return !isCompanionPath(pathname);
}
