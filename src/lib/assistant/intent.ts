/**
 * Lightweight intent hints so live-data questions hit tools instead of RAG links.
 *
 * Note: keyword groups use a leading \b but no trailing \b, so plurals and
 * inflections ("contracts", "expiring", "meetings") still match.
 */

import { CONTRACT_DEPARTMENTS } from "../../../constants";

export type AssistantDataIntent =
	| "list_tasks"
	| "create_task"
	| "search_contracts"
	| "create_contract"
	| "search_licenses"
	| "list_pending_approvals"
	| "expiring"
	| "schedule_event"
	| "view_schedule"
	| "view_audit"
	| "complete_task"
	| "reschedule_event"
	| "cancel_event"
	| "update_user_profile"
	| "list_users"
	| "list_departments"
	| "list_roles"
	| "invite_user"
	| null;

/**
 * Pull a known department name from a people-list ask
 * (e.g. "users in the IT department" → "IT").
 */
export function parseDepartmentFilter(message: string): string | undefined {
	const q = message.toLowerCase();
	for (const dept of CONTRACT_DEPARTMENTS) {
		const d = dept.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		if (
			new RegExp(`\\bin(?:\\s+the)?\\s+${d}(?:\\s+department)?\\b`).test(q) ||
			new RegExp(`\\b${d}\\s+department\\b`).test(q)
		) {
			return dept;
		}
	}
	return undefined;
}

export function detectDataIntent(message: string): AssistantDataIntent {
	const q = message.toLowerCase();

	// Invite to CAALM (directory access) before generic user list checks.
	// Form submit uses label "People" (multi) or "Person" (last invitee alone).
	if (
		/\binvite\b/.test(q) ||
		/\bsend\s+(?:an?\s+|and\s+)?invite(?:\s+link)?\b/.test(q) ||
		(/^(?:people|person)\s*:/im.test(message) &&
			/^role\s*:/im.test(message) &&
			/^department\s*:/im.test(message))
	) {
		return "invite_user";
	}

	// Rename / change display name before generic "set … task" checks.
	if (
		(/\b(change|update|set)\s+(?:the\s+)?(?:user\s*)?(?:full\s*)?name\b/.test(
			q,
		) &&
			/\bto\b/.test(q)) ||
		(/\b(change|update|set)\s+username\b/.test(q) && /\bto\b/.test(q)) ||
		(/\brename\b/.test(q) && /\bto\b/.test(q))
	) {
		return "update_user_profile";
	}

	if (
		/\b(mark|set|complete|finish|close|check off|tick)/.test(q) &&
		/\b(task|to-?do)/.test(q)
	) {
		return "complete_task";
	}
	// Create before list so "create a new task" is not treated as listing.
	if (
		(/\b(create|add|make|start|open)\b/.test(q) &&
			/\b(task|to-?do)\b/.test(q)) ||
		/\bhelp me create\b.{0,40}\b(task|to-?do)\b/.test(q) ||
		/\bnew task\b/.test(q)
	) {
		return "create_task";
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
	if (
		/\b(create|add|make|start|draft|new)\b/.test(q) &&
		/\b(contract|agreement)\b/.test(q)
	) {
		return "create_contract";
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
	// People before departments so "users in the IT department" stays list_users.
	if (
		(/\b(users?|people|team members?|directory)\b/.test(q) &&
			/\b(list|show|find|search|who is|who's|look up|lookup|who)\b/.test(q)) ||
		(/\bwho\s+(?:is|are)\s+in\b/.test(q) && Boolean(parseDepartmentFilter(message)))
	) {
		return "list_users";
	}
	if (
		/\broles?\b/.test(q) &&
		/\b(list|show|what|which|available|have)\b/.test(q) &&
		!/\b(assign|change|update|set|remove)\b/.test(q)
	) {
		return "list_roles";
	}
	// Catalog of department names only — not people inside a department.
	if (
		/\bdepartments?\b/.test(q) &&
		/\b(list|show|what|which|available|have|name)\b/.test(q) &&
		!/\b(change|update|set|assign|move)\b/.test(q) &&
		!/\b(users?|people|team members?)\b/.test(q)
	) {
		return "list_departments";
	}
	return null;
}

export function isLiveDataIntent(intent: AssistantDataIntent): boolean {
	return intent !== null;
}
