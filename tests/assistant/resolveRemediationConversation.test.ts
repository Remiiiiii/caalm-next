import { afterEach, describe, expect, it, vi } from "vitest";
import {
	linkRemediationChat,
	unlinkRemediationChat,
} from "@/lib/assistant/remediation-chat-link";
import {
	nextRemediationAction,
	resolveRemediationConversation,
} from "@/lib/assistant/resolveRemediationConversation";

afterEach(() => {
	localStorage.clear();
	vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, ok = true): Response {
	return {
		ok,
		json: async () => body,
	} as Response;
}

describe("nextRemediationAction", () => {
	it("opens when a conversation id is already linked", () => {
		expect(nextRemediationAction({ conversationId: "conv-1" })).toBe("open");
	});

	it("creates when nothing is linked", () => {
		expect(nextRemediationAction(null)).toBe("create");
	});
});

describe("resolveRemediationConversation", () => {
	it("prefers the server link over a different local cache", async () => {
		linkRemediationChat("finding-1", "local-old", false);
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				success: true,
				data: { conversationId: "server-new", hasPlan: true, status: "active" },
			}),
		);
		const resolved = await resolveRemediationConversation(
			"finding-1",
			fetchImpl as unknown as typeof fetch,
		);
		expect(resolved).toEqual({
			conversationId: "server-new",
			hasPlan: true,
			source: "server",
		});
		expect(nextRemediationAction(resolved)).toBe("open");
	});

	it("falls back to localStorage when the server has no link", async () => {
		linkRemediationChat("finding-1", "local-only", true);
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				success: true,
				data: { conversationId: null, hasPlan: false, status: null },
			}),
		);
		const resolved = await resolveRemediationConversation(
			"finding-1",
			fetchImpl as unknown as typeof fetch,
		);
		expect(resolved).toEqual({
			conversationId: "local-only",
			hasPlan: true,
			source: "local",
		});
	});

	it("returns null when neither server nor local has a chat", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				success: true,
				data: { conversationId: null, hasPlan: false, status: null },
			}),
		);
		expect(
			await resolveRemediationConversation(
				"finding-1",
				fetchImpl as unknown as typeof fetch,
			),
		).toBeNull();
		expect(nextRemediationAction(null)).toBe("create");
	});

	it("uses localStorage when fetch fails", async () => {
		linkRemediationChat("finding-1", "offline-chat", false);
		const fetchImpl = vi.fn(async () => {
			throw new Error("offline");
		});
		expect(
			await resolveRemediationConversation(
				"finding-1",
				fetchImpl as unknown as typeof fetch,
			),
		).toEqual({
			conversationId: "offline-chat",
			hasPlan: false,
			source: "local",
		});
	});

	it("does not reopen after unlink", async () => {
		linkRemediationChat("finding-1", "gone", false);
		unlinkRemediationChat("finding-1");
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				success: true,
				data: { conversationId: null, hasPlan: false, status: null },
			}),
		);
		expect(
			await resolveRemediationConversation(
				"finding-1",
				fetchImpl as unknown as typeof fetch,
			),
		).toBeNull();
	});
});
