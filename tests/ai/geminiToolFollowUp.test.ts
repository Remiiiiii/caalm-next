import { describe, expect, it } from "vitest";
import {
	assertGeminiContentRoles,
	buildGeminiToolFollowUpContents,
	type GeminiContent,
} from "@/lib/assistant/geminiToolFollowUp";
import { buildGeminiChatHistory } from "@/lib/assistant/geminiHistory";

describe("assertGeminiContentRoles", () => {
	it("allows user and model", () => {
		expect(() =>
			assertGeminiContentRoles([
				{ role: "user", parts: [{ text: "hi" }] },
				{ role: "model", parts: [{ text: "hello" }] },
			]),
		).not.toThrow();
	});

	it("rejects role function (Gemini 3.x 400 regression)", () => {
		expect(() =>
			assertGeminiContentRoles([
				{
					role: "function",
					parts: [
						{
							functionResponse: {
								name: "list_tasks",
								response: { output: [] },
							},
						},
					],
				},
			]),
		).toThrow(/Invalid Gemini content role "function"/);
	});
});

describe("buildGeminiToolFollowUpContents", () => {
	const history = buildGeminiChatHistory(
		[
			{ role: "user", content: "Earlier question" },
			{ role: "assistant", content: "Earlier answer" },
		],
		"Show my pending tasks",
	) as GeminiContent[];

	it("puts functionResponse under role user, never function", () => {
		const contents = buildGeminiToolFollowUpContents({
			history,
			userMessage: "Show my pending tasks",
			modelContent: {
				role: "model",
				parts: [
					{
						functionCall: {
							name: "list_tasks",
							args: { pendingOnly: "true" },
							id: "call-abc",
						} as Record<string, unknown>,
					},
				],
			},
			functionCall: {
				name: "list_tasks",
				args: { pendingOnly: "true" },
				id: "call-abc",
			},
			toolResult: { tasks: [{ title: "Review contract" }] },
		});

		const roles = contents.map((c) => c.role);
		expect(roles).not.toContain("function");
		expect(roles.every((r) => r === "user" || r === "model")).toBe(true);

		const toolTurn = contents[contents.length - 1]!;
		expect(toolTurn.role).toBe("user");
		expect(toolTurn.parts[0]).toEqual({
			functionResponse: {
				name: "list_tasks",
				response: { output: { tasks: [{ title: "Review contract" }] } },
				id: "call-abc",
			},
		});
	});

	it("preserves model thought / functionCall parts when provided", () => {
		const modelParts: Array<Record<string, unknown>> = [
			{ thoughtSignature: "sig-1" },
			{
				functionCall: {
					name: "search_contracts",
					args: { query: "Acme" },
					id: "call-xyz",
				},
			},
		];
		const contents = buildGeminiToolFollowUpContents({
			history: [],
			userMessage: "Find Acme",
			modelContent: { role: "model", parts: modelParts },
			functionCall: {
				name: "search_contracts",
				args: { query: "Acme" },
				id: "call-xyz",
			},
			toolResult: { contracts: [] },
		});

		const modelTurn = contents.find((c) => c.role === "model");
		expect(modelTurn?.parts).toEqual(modelParts);
	});

	it("synthesizes a model functionCall when model parts are empty", () => {
		const contents = buildGeminiToolFollowUpContents({
			history: [],
			userMessage: "List approvals",
			modelContent: { role: "model", parts: [] },
			functionCall: {
				name: "list_pending_approvals",
				args: {},
			},
			toolResult: { approvals: [] },
		});

		const modelTurn = contents.find((c) => c.role === "model");
		expect(modelTurn?.parts[0]).toEqual({
			functionCall: {
				name: "list_pending_approvals",
				args: {},
			},
		});
	});

	it("orders turns: history → user → model → tool result (user)", () => {
		const contents = buildGeminiToolFollowUpContents({
			history: [
				{ role: "user", parts: [{ text: "Hi" }] },
				{ role: "model", parts: [{ text: "Hello" }] },
			],
			userMessage: "Tasks?",
			modelContent: {
				role: "model",
				parts: [{ functionCall: { name: "list_tasks", args: {} } }],
			},
			functionCall: { name: "list_tasks", args: {} },
			toolResult: { tasks: [] },
		});

		expect(contents.map((c) => c.role)).toEqual([
			"user",
			"model",
			"user",
			"model",
			"user",
		]);
		expect(contents[2]?.parts[0]).toEqual({ text: "Tasks?" });
	});
});
