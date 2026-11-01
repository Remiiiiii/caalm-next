import { describe, expect, it } from "vitest";
import type { AssistantConversationSummary } from "@/components/assistant/assistantTypes";
import {
	filterConversationsByTitle,
	groupAssistantConversations,
} from "@/lib/assistant/groupAssistantHistory";

const now = new Date(2026, 10, 1, 15, 0, 0);

function conv(
	partial: Partial<AssistantConversationSummary> & { $id: string },
): AssistantConversationSummary {
	return {
		title: partial.title ?? "Conversation",
		lastMessagePreview: partial.lastMessagePreview ?? "",
		status: partial.status ?? "closed",
		lastMessageAt: partial.lastMessageAt ?? now.toISOString(),
		$createdAt: partial.$createdAt,
		...partial,
	};
}

function ids(groupId: string, groups: ReturnType<typeof groupAssistantConversations>) {
	return groups.find((g) => g.id === groupId)?.conversations.map((c) => c.$id) ?? [];
}

describe("filterConversationsByTitle", () => {
	const rows = [
		conv({ $id: "1", title: "Q4 Review" }),
		conv({ $id: "2", title: "Schedule meeting" }),
	];

	it("returns all rows when the query is empty", () => {
		expect(filterConversationsByTitle(rows, "   ").map((c) => c.$id)).toEqual([
			"1",
			"2",
		]);
	});

	it("matches titles case-insensitively", () => {
		expect(filterConversationsByTitle(rows, "q4").map((c) => c.$id)).toEqual([
			"1",
		]);
	});

	it("returns an empty list when nothing matches", () => {
		expect(filterConversationsByTitle(rows, "zzz")).toEqual([]);
	});
});

describe("groupAssistantConversations", () => {
	it("puts the open conversation in Active and does not repeat it", () => {
		const groups = groupAssistantConversations(
			[
				conv({
					$id: "open",
					title: "Current",
					lastMessageAt: new Date(2026, 10, 1, 10).toISOString(),
				}),
				conv({
					$id: "other",
					title: "Also today",
					lastMessageAt: new Date(2026, 10, 1, 9).toISOString(),
				}),
			],
			{ activeId: "open", now },
		);

		expect(ids("active", groups)).toEqual(["open"]);
		expect(ids("today", groups)).toEqual(["other"]);
	});

	it("omits Active when no conversation is open", () => {
		const groups = groupAssistantConversations(
			[
				conv({
					$id: "t",
					lastMessageAt: new Date(2026, 10, 1, 9).toISOString(),
				}),
			],
			{ now },
		);
		expect(groups.map((g) => g.id)).toEqual(["today"]);
	});

	it("splits today, previous 7 days, and older by lastMessageAt", () => {
		const groups = groupAssistantConversations(
			[
				conv({
					$id: "today",
					lastMessageAt: new Date(2026, 10, 1, 8).toISOString(),
				}),
				conv({
					$id: "yesterday",
					lastMessageAt: new Date(2026, 9, 31, 12).toISOString(),
				}),
				conv({
					$id: "week",
					lastMessageAt: new Date(2026, 9, 25, 12).toISOString(),
				}),
				conv({
					$id: "old",
					lastMessageAt: new Date(2026, 9, 24, 12).toISOString(),
				}),
			],
			{ now },
		);

		expect(ids("today", groups)).toEqual(["today"]);
		expect(ids("previous7", groups)).toEqual(["yesterday", "week"]);
		expect(ids("older", groups)).toEqual(["old"]);
	});

	it("falls back to $createdAt when lastMessageAt is missing", () => {
		const groups = groupAssistantConversations(
			[
				conv({
					$id: "created",
					lastMessageAt: "",
					$createdAt: new Date(2026, 9, 31, 12).toISOString(),
				}),
			],
			{ now },
		);
		expect(ids("previous7", groups)).toEqual(["created"]);
	});
});
