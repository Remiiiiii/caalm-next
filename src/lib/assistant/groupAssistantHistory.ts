import { isSameDay, startOfDay, subDays } from "date-fns";
import type { AssistantConversationSummary } from "@/components/assistant/assistantTypes";

export type AssistantHistoryGroupId =
	| "active"
	| "today"
	| "previous7"
	| "older";

export type AssistantHistoryGroup = {
	id: AssistantHistoryGroupId;
	label: string;
	conversations: AssistantConversationSummary[];
};

const GROUP_DEFS: Array<{
	id: AssistantHistoryGroupId;
	label: string;
}> = [
	{ id: "active", label: "Active" },
	{ id: "today", label: "Today" },
	{ id: "previous7", label: "Previous 7 days" },
	{ id: "older", label: "Older" },
];

function conversationTimestamp(c: AssistantConversationSummary): Date {
	return new Date(c.lastMessageAt || c.$createdAt || 0);
}

export function filterConversationsByTitle(
	conversations: AssistantConversationSummary[],
	query: string,
): AssistantConversationSummary[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return conversations;
	return conversations.filter((c) =>
		(c.title || "").toLowerCase().includes(needle),
	);
}

export function groupAssistantConversations(
	conversations: AssistantConversationSummary[],
	options: { activeId?: string | null; now?: Date } = {},
): AssistantHistoryGroup[] {
	const now = options.now ?? new Date();
	const activeId = options.activeId ?? null;
	const previousWindowStart = startOfDay(subDays(now, 7));

	const buckets: Record<
		AssistantHistoryGroupId,
		AssistantConversationSummary[]
	> = {
		active: [],
		today: [],
		previous7: [],
		older: [],
	};

	for (const conversation of conversations) {
		if (activeId && conversation.$id === activeId) {
			buckets.active.push(conversation);
			continue;
		}
		const ts = conversationTimestamp(conversation);
		if (Number.isNaN(ts.getTime()) || isSameDay(ts, now)) {
			buckets.today.push(conversation);
			continue;
		}
		if (ts >= previousWindowStart) {
			buckets.previous7.push(conversation);
			continue;
		}
		buckets.older.push(conversation);
	}

	return GROUP_DEFS.flatMap((def) => {
		const items = buckets[def.id];
		if (!items.length) return [];
		return [{ id: def.id, label: def.label, conversations: items }];
	});
}
