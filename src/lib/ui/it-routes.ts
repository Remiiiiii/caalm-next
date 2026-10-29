/**
 * IT area UI helpers. Rules: `.cursor/rules/it-routes-dropdowns-and-header.mdc`
 * and `.cursor/rules/it-routes-buttons.mdc`.
 */

/** IT staff pages: `/dashboard/it/**` and the ticket queue/detail (not `/tickets/new`). */
export function isItRoute(pathname: string | null | undefined): boolean {
	if (!pathname) return false;
	if (pathname === "/dashboard/it" || pathname.startsWith("/dashboard/it/")) {
		return true;
	}
	if (pathname === "/tickets") return true;
	return pathname.startsWith("/tickets/") && pathname !== "/tickets/new";
}

/**
 * Dropdown panel for the IT routes: white with a little transparency, like the
 * submitter bar on a ticket. Pass to `*Content`; it merges over the glass default.
 */
export const IT_DROPDOWN_PANEL =
	"border-slate-200/60 bg-white/90 backdrop-blur-sm";
