import { describe, expect, it } from "vitest";
import { buildGeminiChatHistory } from "@/lib/assistant/geminiHistory";

describe("buildGeminiChatHistory", () => {
	it("maps assistant to model and drops the current user turn", () => {
		const history = buildGeminiChatHistory(
			[
				{ role: "user", content: "First" },
				{ role: "assistant", content: "Reply" },
				{ role: "user", content: "Current" },
			],
			"Current",
		);

		expect(history).toEqual([
			{ role: "user", parts: [{ text: "First" }] },
			{ role: "model", parts: [{ text: "Reply" }] },
		]);
		expect(history.every((m) => m.role === "user" || m.role === "model")).toBe(
			true,
		);
	});

	it("drops leading assistant turns so history starts with user", () => {
		const history = buildGeminiChatHistory(
			[
				{ role: "assistant", content: "Orphan" },
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi" },
			],
			"New message",
		);

		expect(history[0]?.role).toBe("user");
		expect(history.map((m) => m.role)).not.toContain("assistant");
		expect(history.map((m) => m.role)).not.toContain("function");
	});

	it("merges consecutive same-role messages", () => {
		const history = buildGeminiChatHistory(
			[
				{ role: "user", content: "One" },
				{ role: "user", content: "Two" },
				{ role: "assistant", content: "A" },
				{ role: "assistant", content: "B" },
			],
			"Fresh",
		);

		expect(history).toEqual([
			{ role: "user", parts: [{ text: "One\n\nTwo" }] },
			{ role: "model", parts: [{ text: "A\n\nB" }] },
		]);
	});
});
