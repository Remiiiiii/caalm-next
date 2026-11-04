/** Browser map: finding id → Ask CAALM conversation id (Show me how sessions). */

const STORAGE_KEY = "caalm_remediation_chat_by_finding";

function readMap(): Record<string, string> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") return {};
		const out: Record<string, string> = {};
		for (const [key, value] of Object.entries(
			parsed as Record<string, unknown>,
		)) {
			if (typeof value === "string" && value.trim()) {
				out[key] = value.trim();
			}
		}
		return out;
	} catch {
		return {};
	}
}

function writeMap(map: Record<string, string>): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {
		// ignore quota / private mode
	}
}

export const REMEDIATION_CHAT_LINK_EVENT = "caalm-remediation-chat-link";

export function linkRemediationChat(
	findingId: string,
	conversationId: string,
): void {
	const id = findingId.trim();
	const conv = conversationId.trim();
	if (!id || !conv) return;
	const map = readMap();
	map[id] = conv;
	writeMap(map);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent(REMEDIATION_CHAT_LINK_EVENT, {
				detail: { findingId: id, conversationId: conv },
			}),
		);
	}
}

export function getRemediationChatId(findingId: string): string | null {
	const id = findingId.trim();
	if (!id) return null;
	return readMap()[id] ?? null;
}
