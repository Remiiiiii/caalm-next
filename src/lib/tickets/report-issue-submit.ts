import type { TicketLane } from "@/lib/tickets/ticket.types";

export function buildReportIssueFullFormHref(input: {
	lane: TicketLane | "";
	title: string;
	category: string;
	affectedModule?: string;
}): string {
	const params = new URLSearchParams();
	if (input.lane) params.set("lane", input.lane);
	if (input.title.trim()) params.set("title", input.title.trim());
	if (input.category) params.set("category", input.category);
	if (input.lane === "engineering" && input.affectedModule) {
		params.set("module", input.affectedModule);
	}
	const query = params.toString();
	return query ? `/tickets/new?${query}` : "/tickets/new";
}

/** Help can post from the FAB. Engineering must use the full GitHub-style form. */
export function canQuickSubmitReportIssue(lane: TicketLane | ""): boolean {
	return lane === "help";
}

/**
 * The category dropdown renders in a Radix portal on document.body.
 * Treat those clicks as inside the panel so picking an option does not close it.
 */
export function shouldCloseReportIssuePanel(
	target: EventTarget | null,
	panel: HTMLElement | null,
): boolean {
	if (!panel) return false;
	if (target instanceof Node && panel.contains(target)) return false;
	if (!(target instanceof Element)) return true;
	if (
		target.closest("[data-radix-popper-content-wrapper]") ||
		target.closest("[data-radix-select-content]") ||
		target.closest("[role='listbox']")
	) {
		return false;
	}
	return true;
}
