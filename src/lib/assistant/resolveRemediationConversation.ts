import {
	getRemediationLink,
	linkRemediationChat,
} from "@/lib/assistant/remediation-chat-link";

export type ResolvedRemediationChat = {
	conversationId: string;
	hasPlan: boolean;
	source: "server" | "local";
};

export function nextRemediationAction(
	resolved: { conversationId: string } | null,
): "open" | "create" {
	return resolved?.conversationId ? "open" : "create";
}

function conversationIdFromPayload(json: unknown): {
	conversationId: string;
	hasPlan: boolean;
} | null {
	if (!json || typeof json !== "object") return null;
	const data = (json as { data?: unknown }).data;
	if (!data || typeof data !== "object") return null;
	const rec = data as Record<string, unknown>;
	const conversationId =
		typeof rec.conversationId === "string" ? rec.conversationId.trim() : "";
	if (!conversationId) return null;
	return { conversationId, hasPlan: rec.hasPlan === true };
}

/** Server link first, then this-browser localStorage cache. */
export async function resolveRemediationConversation(
	findingId: string,
	fetchImpl: typeof fetch = fetch,
): Promise<ResolvedRemediationChat | null> {
	const id = findingId.trim();
	if (!id) return null;

	try {
		const res = await fetchImpl(
			`/api/assistant/conversations?findingId=${encodeURIComponent(id)}`,
		);
		if (res.ok) {
			const json: unknown = await res.json();
			const hit = conversationIdFromPayload(json);
			if (hit) {
				linkRemediationChat(id, hit.conversationId, hit.hasPlan);
				return { ...hit, source: "server" };
			}
		}
	} catch {
		// Offline / network — use the local cache.
	}

	const local = getRemediationLink(id);
	if (!local) return null;
	return {
		conversationId: local.conversationId,
		hasPlan: local.hasPlan,
		source: "local",
	};
}
