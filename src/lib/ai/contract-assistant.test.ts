import { describe, expect, it } from "vitest";
import {
	combinePageTexts,
	parseCitations,
	parseContractAssistantJson,
	parseStarterPrompts,
} from "@/lib/ai/contract-assistant";

describe("contract assistant parsers", () => {
	it("maps citation ids to pages and quotes", () => {
		const citations = parseCitations([
			{ id: 1, pages: [2, 3], quote: "Period of performance" },
			{ id: "bad", pages: [1], quote: "skip" },
			{ id: 2, pages: ["4"], quote: "FAR 52.204-21" },
		]);
		expect(citations).toEqual([
			{ id: 1, pages: [2, 3], quote: "Period of performance" },
			{ id: 2, pages: [4], quote: "FAR 52.204-21" },
		]);
	});

	it("returns empty citations when the model payload is malformed", () => {
		expect(parseCitations(null)).toEqual([]);
		expect(parseCitations("not-an-array")).toEqual([]);
	});

	it("parses JSON even when wrapped in markdown fences", () => {
		const parsed = parseContractAssistantJson(`\`\`\`json
{
  "answerMarkdown": "1. **Deadlines**\\n- Monthly reports [1]",
  "citations": [{"id":1,"pages":[1],"quote":"monthly performance reports"}],
  "suggestedQuestions": ["Which reports are due first?"],
  "starterPrompts": [{"label":"Map deadlines","prompt":"Map all reporting deadlines in this contract."}]
}
\`\`\``);
		expect(parsed.answerMarkdown).toContain("Deadlines");
		expect(parsed.citations[0]?.pages).toEqual([1]);
		expect(parsed.suggestedQuestions).toHaveLength(1);
		expect(parsed.starterPrompts[0]?.label).toBe("Map deadlines");
	});

	it("falls back to empty markdown and default questions when JSON is invalid", () => {
		const parsed = parseContractAssistantJson("not json");
		expect(parsed.answerMarkdown).toBe("");
		expect(parsed.citations).toEqual([]);
		expect(parsed.suggestedQuestions.length).toBeGreaterThan(0);
	});

	it("keeps quote-only citations for SAM text without pages", () => {
		const citations = parseCitations([
			{ id: 1, pages: [], quote: "response deadline is 30 days" },
		]);
		expect(citations[0]).toEqual({
			id: 1,
			pages: [],
			quote: "response deadline is 30 days",
		});
	});

	it("limits starter prompts to four valid items", () => {
		const prompts = parseStarterPrompts([
			{ label: "A", prompt: "Ask A" },
			{ label: "B", prompt: "Ask B" },
			{ label: "C" },
			{ label: "D", prompt: "Ask D" },
			{ label: "E", prompt: "Ask E" },
			{ label: "F", prompt: "Ask F" },
		]);
		expect(prompts).toHaveLength(4);
		expect(prompts.map((item) => item.label)).toEqual(["A", "B", "D", "E"]);
	});

	it("prefixes combined page text with page markers", () => {
		expect(
			combinePageTexts([
				{ page: 1, text: "SOW" },
				{ page: 2, text: "FAR clauses" },
			]),
		).toBe("[[PAGE:1]]\nSOW\n\n[[PAGE:2]]\nFAR clauses");
	});
});
