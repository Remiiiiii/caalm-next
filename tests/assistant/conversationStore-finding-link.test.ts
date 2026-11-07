import { describe, expect, it } from "vitest";
import {
	type AssistantConversation,
	pickConversationForFinding,
} from "@/lib/assistant/conversationStore";

function conv(
	partial: Partial<AssistantConversation> & { $id: string },
): AssistantConversation {
	return {
		userId: "u",
		orgId: "o",
		title: "Chat",
		lastMessagePreview: "",
		status: "closed",
		lastMessageAt: "2026-11-05T00:00:00.000Z",
		$createdAt: "2026-11-05T00:00:00.000Z",
		$updatedAt: "2026-11-05T00:00:00.000Z",
		...partial,
	};
}

describe("pickConversationForFinding", () => {
	it("returns null for an empty list", () => {
		expect(pickConversationForFinding([])).toBeNull();
	});

	it("prefers the live session over a newer closed one", () => {
		const picked = pickConversationForFinding([
			conv({
				$id: "closed-new",
				status: "closed",
				lastMessageAt: "2026-11-05T12:00:00.000Z",
			}),
			conv({
				$id: "live",
				status: "active",
				lastMessageAt: "2026-11-04T12:00:00.000Z",
			}),
		]);
		expect(picked?.$id).toBe("live");
	});

	it("uses the first row when none are live", () => {
		const picked = pickConversationForFinding([
			conv({ $id: "first" }),
			conv({ $id: "second" }),
		]);
		expect(picked?.$id).toBe("first");
	});
});
