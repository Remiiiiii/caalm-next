import { GoogleGenerativeAI } from "@google/generative-ai";
import { CLAUSE_CATEGORIES } from "@/types/clauses";
import type {
	DeviationCompareResult,
	ExtractedClauseInput,
} from "@/types/playbook-deviations";
import {
	parseDeviationCompareResult,
	parseExtractedClauses,
} from "@/lib/playbook/deviation-scoring";

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const compareModel = genAI.getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.1,
		maxOutputTokens: 1024,
	},
});

const extractModel = genAI.getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.1,
		maxOutputTokens: 4096,
	},
});

const MAX_CLAUSE_CHARS = 4000;
const MAX_CONTENT_CHARS = 90000;

function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max)}\n…`;
}

export function geminiCompareUnavailableResult(): DeviationCompareResult {
	return {
		verdict: "deviate",
		severity: "medium",
		rationale:
			"Could not compare this clause to the playbook. Treat it as off-standard until a reviewer checks it.",
		differingPoints: ["Comparison service was unavailable"],
	};
}

export async function compareClauseWithGemini(
	extracted: ExtractedClauseInput,
	standard: { title: string; category: string; body: string },
): Promise<DeviationCompareResult> {
	if (!apiKey) return geminiCompareUnavailableResult();

	const prompt = `You compare a contract clause against an organization's published playbook standard.

Return ONE JSON object only with exactly these keys:
- "verdict": "pass" if the extracted clause has the same legal effect as the standard, or "deviate" if it is weaker, missing a requirement, adds risk, or changes the deal.
- "severity": "low" | "medium" | "high" (how serious the deviation is; use "low" when verdict is pass)
- "rationale": 1-2 short sentences for a non-lawyer reviewer
- "differingPoints": array of short strings naming the gaps (empty when verdict is pass)

Do not invent facts that are not in the two texts.

STANDARD (${standard.category} — ${standard.title}):
${clip(standard.body, MAX_CLAUSE_CHARS)}

EXTRACTED${extracted.title ? ` (${extracted.title})` : ""}:
${clip(extracted.body, MAX_CLAUSE_CHARS)}`;

	try {
		const result = await compareModel.generateContent(prompt);
		return parseDeviationCompareResult(result.response.text() ?? "{}");
	} catch (error) {
		console.error("[playbook compare] Gemini failed", error);
		return geminiCompareUnavailableResult();
	}
}

export async function extractClausesWithGemini(
	content: string,
): Promise<ExtractedClauseInput[]> {
	const text = content.trim();
	if (!text || !apiKey) return [];

	const categoryList = CLAUSE_CATEGORIES.join(", ");
	const prompt = `Extract the distinct legal clauses from this contract text.

Return ONE JSON object only:
- "clauses": array of objects with:
  - "title": short label
  - "category": one of ${categoryList}
  - "body": the clause text (keep the operative language)

Skip signatures, recitals-only headers, and empty sections.

CONTRACT:
${clip(text, MAX_CONTENT_CHARS)}`;

	try {
		const result = await extractModel.generateContent(prompt);
		return parseExtractedClauses(result.response.text() ?? "{}");
	} catch (error) {
		console.error("[playbook extract] Gemini failed", error);
		return [];
	}
}
