/** Browser map: finding id → Ask CAALM conversation id (Show me how sessions). */

const STORAGE_KEY = "caalm_remediation_chat_by_finding";

type RemediationChatLink = {
	conversationId: string;
	/** Whether that session's research ended with a concrete, applyable corrective-action plan. */
	hasPlan: boolean;
};

function readMap(): Record<string, RemediationChatLink> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") return {};
		const out: Record<string, RemediationChatLink> = {};
		for (const [key, value] of Object.entries(
			parsed as Record<string, unknown>,
		)) {
			// Legacy entries (pre-hasPlan) were a bare conversation id string.
			if (typeof value === "string" && value.trim()) {
				out[key] = { conversationId: value.trim(), hasPlan: false };
				continue;
			}
			if (value && typeof value === "object") {
				const rec = value as Record<string, unknown>;
				const conversationId =
					typeof rec.conversationId === "string"
						? rec.conversationId.trim()
						: "";
				if (conversationId) {
					out[key] = { conversationId, hasPlan: rec.hasPlan === true };
				}
			}
		}
		return out;
	} catch {
		return {};
	}
}

function writeMap(map: Record<string, RemediationChatLink>): void {
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
	hasPlan: boolean,
): void {
	const id = findingId.trim();
	const conv = conversationId.trim();
	if (!id || !conv) return;
	const map = readMap();
	map[id] = { conversationId: conv, hasPlan };
	writeMap(map);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent(REMEDIATION_CHAT_LINK_EVENT, {
				detail: { findingId: id, conversationId: conv, hasPlan },
			}),
		);
	}
}

export function getRemediationChatId(findingId: string): string | null {
	const id = findingId.trim();
	if (!id) return null;
	return readMap()[id]?.conversationId ?? null;
}

/** True once a Show me how session for this finding produced an applyable corrective-action plan. */
export function hasRemediationPlan(findingId: string): boolean {
	const id = findingId.trim();
	if (!id) return false;
	return readMap()[id]?.hasPlan === true;
}
