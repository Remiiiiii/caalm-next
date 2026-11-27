import { afterEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn(async () => ({
	content: [{ type: "text", text: "ok" }],
}));

vi.mock("@anthropic-ai/sdk", () => ({
	default: class MockAnthropic {
		messages = { create: createMock };
	},
}));

afterEach(() => {
	createMock.mockClear();
	delete process.env.CLAUDE_API_KEY;
});

describe("callClaudeAssistantTurn tool_choice", () => {
	// This model rejects tool_choice "any"/"tool" (confirmed via live 400
	// invalid_request_error) — tool_choice must stay "auto" regardless of
	// forceTool; forcing is done via a prompt nudge instead.
	it("keeps tool_choice auto even when forceTool is true", async () => {
		process.env.CLAUDE_API_KEY = "test-key";
		const { callClaudeAssistantTurn } = await import(
			"@/lib/assistant/claudeChat"
		);
		await callClaudeAssistantTurn({
			systemInstruction: "system",
			messages: [],
			userMessage:
				"create a new calendar event meeting for November 26 2026 from 10am - 11am",
			tools: [
				{ name: "create_calendar_event", input_schema: { type: "object" } },
			] as never,
			forceTool: true,
		});
		expect(createMock).toHaveBeenCalledWith(
			expect.objectContaining({ tool_choice: { type: "auto" } }),
		);
	});

	it("keeps tool_choice auto when not forced", async () => {
		process.env.CLAUDE_API_KEY = "test-key";
		const { callClaudeAssistantTurn } = await import(
			"@/lib/assistant/claudeChat"
		);
		await callClaudeAssistantTurn({
			systemInstruction: "system",
			messages: [],
			userMessage: "hello",
			tools: [
				{ name: "create_calendar_event", input_schema: { type: "object" } },
			] as never,
			forceTool: false,
		});
		expect(createMock).toHaveBeenCalledWith(
			expect.objectContaining({ tool_choice: { type: "auto" } }),
		);
	});
});
