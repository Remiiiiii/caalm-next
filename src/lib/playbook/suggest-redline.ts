import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonObjectFromModelText } from "@/lib/ai/contractTypeSuggestionSchema";
import type { ExtractedClauseInput } from "@/types/playbook-deviations";

const apiKey = process.env.GOOGLE_API_KEY || "";

const redlineModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.1,
		maxOutputTokens: 1024,
	},
});

const MAX_CLAUSE_CHARS = 4000;

function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max)}\n…`;
}

export type RedlineSuggestion = {
	suggestedText: string;
	explanation: string;
};

export function redlineUnavailableResult(): RedlineSuggestion {
	return {
		suggestedText: "",
		explanation:
			"Could not generate a redline suggestion for this clause. A reviewer should draft one manually.",
	};
}

/** Proposes replacement language for a clause that deviates from a playbook standard. Never writes anything — proposal only. */
export async function suggestRedlineForClause(
	extracted: ExtractedClauseInput,
	standard: { title: string; category: string; body: string },
): Promise<RedlineSuggestion> {
	if (!apiKey) return redlineUnavailableResult();

	const prompt = `You propose a redline edit to bring a contract clause in line with an organization's playbook standard.

Return ONE JSON object only with exactly these keys:
- "suggestedText": the replacement clause language (keep it as close to the original as possible while fixing the deviation)
- "explanation": 1-2 short sentences for a non-lawyer reviewer explaining what changed and why

Do not invent facts that are not in the two texts.

STANDARD (${standard.category} — ${standard.title}):
${clip(standard.body, MAX_CLAUSE_CHARS)}

CURRENT CLAUSE${extracted.title ? ` (${extracted.title})` : ""}:
${clip(extracted.body, MAX_CLAUSE_CHARS)}`;

	try {
		const result = await redlineModel.generateContent(prompt);
		const raw = result.response.text() ?? "{}";
		const parsed = JSON.parse(extractJsonObjectFromModelText(raw)) as Record<
			string,
			unknown
		>;
		const suggestedText =
			typeof parsed.suggestedText === "string"
				? parsed.suggestedText.trim()
				: "";
		const explanation =
			typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";
		if (!suggestedText) return redlineUnavailableResult();
		return {
			suggestedText,
			explanation:
				explanation || "Aligns the clause with the playbook standard.",
		};
	} catch (error) {
		console.error("[playbook redline] Gemini failed", error);
		return redlineUnavailableResult();
	}
}
