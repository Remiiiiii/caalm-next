/**
 * Lightweight intent hints so live-data questions hit tools instead of RAG links.
 */

export type AssistantDataIntent =
	| "list_tasks"
	| "search_contracts"
	| "search_licenses"
	| "list_pending_approvals"
	| "expiring"
	| null;

export function detectDataIntent(message: string): AssistantDataIntent {
	const q = message.toLowerCase();

	if (
		/\b(task|tasks|to-?dos?|todo)\b/.test(q) &&
		/\b(show|list|pending|open|my|assigned|due)\b/.test(q)
	) {
		return "list_tasks";
	}
	if (/\b(pending|open)\s+tasks?\b/.test(q) || /\btasks?\s+(pending|open)\b/.test(q)) {
		return "list_tasks";
	}
	if (/\b(approvals?|approve)\b/.test(q) && /\b(pending|list|show|my)\b/.test(q)) {
		return "list_pending_approvals";
	}
	if (
		/\b(expir|renewal|due soon)\b/.test(q) &&
		/\b(contract|license|licences?)\b/.test(q)
	) {
		return "expiring";
	}
	if (/\b(contract|contracts)\b/.test(q) && /\b(search|find|show|list)\b/.test(q)) {
		return "search_contracts";
	}
	if (/\b(license|licenses|licences?)\b/.test(q) && /\b(search|find|show|list)\b/.test(q)) {
		return "search_licenses";
	}
	return null;
}

export function isLiveDataIntent(intent: AssistantDataIntent): boolean {
	return intent !== null;
}
