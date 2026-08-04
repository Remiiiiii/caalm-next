/**
 * Lightweight intent hints so live-data questions hit tools instead of RAG links.
 *
 * Note: keyword groups use a leading \b but no trailing \b, so plurals and
 * inflections ("contracts", "expiring", "meetings") still match.
 */

export type AssistantDataIntent =
	| "list_tasks"
	| "search_contracts"
	| "search_licenses"
	| "list_pending_approvals"
	| "expiring"
	| "schedule_event"
	| "view_schedule"
	| "view_audit"
	| "complete_task"
	| "reschedule_event"
	| "cancel_event"
	| null;

export function detectDataIntent(message: string): AssistantDataIntent {
	const q = message.toLowerCase();

	if (
		/\b(mark|set|complete|finish|close|check off|tick)/.test(q) &&
		/\b(task|to-?do)/.test(q)
	) {
		return "complete_task";
	}
	if (
		/\b(task|tasks|to-?dos?|todo)/.test(q) &&
		/\b(show|list|pending|open|my|assigned|due)/.test(q)
	) {
		return "list_tasks";
	}
	if (
		/\b(pending|open)\s+tasks?/.test(q) ||
		/\btasks?\s+(pending|open)/.test(q)
	) {
		return "list_tasks";
	}
	if (/\b(approvals?|approve)/.test(q) && /\b(pending|list|show|my)/.test(q)) {
		return "list_pending_approvals";
	}
	if (
		/\b(expir|renewal|due soon)/.test(q) &&
		/\b(contract|license|licences?)/.test(q)
	) {
		return "expiring";
	}
	if (
		/\b(reschedule|move|push|postpone|change)\b/.test(q) &&
		/\b(meeting|meet|call|event|appointment|review)\b/.test(q)
	) {
		return "reschedule_event";
	}
	if (
		/\b(cancel|delete|remove|call off)\b/.test(q) &&
		/\b(meeting|meet|call|event|appointment|review)\b/.test(q)
	) {
		return "cancel_event";
	}
	if (
		/\b(schedule|book|set\s?up|arrange|plan)/.test(q) &&
		/\b(meeting|meet|call|event|review|appointment)/.test(q)
	) {
		return "schedule_event";
	}
	if (
		/\b(my|on my|the)\s+(schedule|calendar|meetings|agenda)/.test(q) ||
		/\bwhat('s| is| do i have)\b.{0,30}\b(schedule|calendar|meetings|today|tomorrow|this week|thursday|friday|monday|tuesday|wednesday)/.test(
			q,
		) ||
		/\b(am i|are we)\s+(free|busy|booked)/.test(q)
	) {
		return "view_schedule";
	}
	if (
		/\b(audit|activity log|recent activity|recent changes|who changed|change history)/.test(
			q,
		)
	) {
		return "view_audit";
	}
	if (/\b(contract|contracts)/.test(q) && /\b(search|find|show|list)/.test(q)) {
		return "search_contracts";
	}
	if (
		/\b(license|licenses|licences?)/.test(q) &&
		/\b(search|find|show|list)/.test(q)
	) {
		return "search_licenses";
	}
	return null;
}

export function isLiveDataIntent(intent: AssistantDataIntent): boolean {
	return intent !== null;
}
