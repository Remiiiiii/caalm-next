/**
 * Lightweight intent hints so live-data questions hit tools instead of RAG links.
 */

export type AssistantDataIntent =
	| "list_tasks"
	| "search_contracts"
	| "search_licenses"
	| "list_pending_approvals"
	| "expiring"
	| "schedule_event"
	| "view_schedule"
	| null;

export function detectDataIntent(message: string): AssistantDataIntent {
	const q = message.toLowerCase();

	if (
		/\b(task|tasks|to-?dos?|todo)\b/.test(q) &&
		/\b(show|list|pending|open|my|assigned|due)\b/.test(q)
	) {
		return "list_tasks";
	}
	if (
		/\b(pending|open)\s+tasks?\b/.test(q) ||
		/\btasks?\s+(pending|open)\b/.test(q)
	) {
		return "list_tasks";
	}
	if (
		/\b(approvals?|approve)\b/.test(q) &&
		/\b(pending|list|show|my)\b/.test(q)
	) {
		return "list_pending_approvals";
	}
	if (
		/\b(expir|renewal|due soon)\b/.test(q) &&
		/\b(contract|license|licences?)\b/.test(q)
	) {
		return "expiring";
	}
	if (
		/\b(schedule|book|set\s?up|arrange|plan)\b/.test(q) &&
		/\b(meeting|meet|call|event|review|appointment)\b/.test(q)
	) {
		return "schedule_event";
	}
	if (
		/\b(my|on my|the)\s+(schedule|calendar|meetings|agenda)\b/.test(q) ||
		/\bwhat('s| is| do i have)\b.{0,30}\b(schedule|calendar|meetings|today|tomorrow|this week|thursday|friday|monday|tuesday|wednesday)\b/.test(
			q,
		) ||
		/\b(am i|are we)\s+(free|busy|booked)\b/.test(q)
	) {
		return "view_schedule";
	}
	if (
		/\b(contract|contracts)\b/.test(q) &&
		/\b(search|find|show|list)\b/.test(q)
	) {
		return "search_contracts";
	}
	if (
		/\b(license|licenses|licences?)\b/.test(q) &&
		/\b(search|find|show|list)\b/.test(q)
	) {
		return "search_licenses";
	}
	return null;
}

export function isLiveDataIntent(intent: AssistantDataIntent): boolean {
	return intent !== null;
}
