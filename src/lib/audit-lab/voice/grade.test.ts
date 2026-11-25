import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({
	createMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
	class MockAnthropic {
		messages = { create: createMock };
	}
	return { default: MockAnthropic };
});

vi.mock("@/lib/assistant/claudeChat", () => ({
	claudeModel: () => "claude-sonnet-5-5",
}));

import { summarizeVoiceTranscript } from "./grade";

const rubric = [
	{
		questionId: "q1",
		prompt: "Explain the control.",
		source: "manual",
		difficulty: "medium",
		requiresEvidence: false,
	},
];
const transcript = [
	{
		questionId: "q1",
		question: "Explain the control.",
		answer: "We log every access.",
	},
];

function textResponse(text: string) {
	return { content: [{ type: "text", text }] };
}

describe("summarizeVoiceTranscript", () => {
	const originalKey = process.env.CLAUDE_API_KEY;

	beforeEach(() => {
		createMock.mockReset();
		process.env.CLAUDE_API_KEY = "test-key";
	});

	afterEach(() => {
		process.env.CLAUDE_API_KEY = originalKey;
	});

	it("parses a well-formed JSON response", async () => {
		createMock.mockResolvedValue(
			textResponse(
				JSON.stringify({
					strengths: ["Clear answer"],
					gaps: [],
					notableQuotes: [{ quote: "We log every access.", context: "q1" }],
					narrative: "Solid overall.",
				}),
			),
		);

		const result = await summarizeVoiceTranscript({ rubric, transcript });

		expect(result.strengths).toEqual(["Clear answer"]);
		expect(result.narrative).toBe("Solid overall.");
	});

	it("falls back to an empty summary when the response isn't valid JSON", async () => {
		createMock.mockResolvedValue(textResponse("not json at all"));

		const result = await summarizeVoiceTranscript({ rubric, transcript });

		expect(result).toEqual({
			strengths: [],
			gaps: [],
			notableQuotes: [],
			narrative: "Summary unavailable.",
		});
	});

	it("falls back when the API call throws", async () => {
		createMock.mockRejectedValue(new Error("network error"));

		const result = await summarizeVoiceTranscript({ rubric, transcript });

		expect(result.narrative).toBe("Summary unavailable.");
	});

	it("falls back when no transcript is available", async () => {
		createMock.mockResolvedValue(
			textResponse(
				JSON.stringify({
					strengths: [],
					gaps: [],
					notableQuotes: [],
					narrative: "No answers given.",
				}),
			),
		);

		const result = await summarizeVoiceTranscript({ rubric, transcript: [] });

		expect(result.narrative).toBe("No answers given.");
	});

	it("falls back when CLAUDE_API_KEY is missing", async () => {
		delete process.env.CLAUDE_API_KEY;

		const result = await summarizeVoiceTranscript({ rubric, transcript });

		expect(result.narrative).toBe("Summary unavailable.");
		expect(createMock).not.toHaveBeenCalled();
	});
});
