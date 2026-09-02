import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
	ContractAssistantAnalyzeResult,
	ContractAssistantAnswerResult,
	ContractCitation,
	ContractStarterPrompt,
	PdfPageText,
} from "@/lib/ai/contract-assistant.types";
import {
	CONTRACT_ASSISTANT_FALLBACK_QUESTIONS,
	CONTRACT_ASSISTANT_FALLBACK_STARTERS,
} from "@/lib/ai/contract-assistant.types";
import { extractJsonObjectFromModelText } from "@/lib/ai/contractTypeSuggestionSchema";

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const jsonModel = genAI.getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.2,
		maxOutputTokens: 4096,
	},
});

const MAX_PAGE_CHARS = 14000;
const MAX_TOTAL_CHARS = 90000;

function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max)}\n…`;
}

export function combinePageTexts(pageTexts: PdfPageText[]): string {
	if (!pageTexts.length) return "";
	return pageTexts
		.map(
			(entry) => `[[PAGE:${entry.page}]]\n${clip(entry.text, MAX_PAGE_CHARS)}`,
		)
		.join("\n\n");
}

export function buildContractCorpus(options: {
	pageTexts?: PdfPageText[];
	fileContent?: string;
}): string {
	if (options.pageTexts?.length) {
		return clip(combinePageTexts(options.pageTexts), MAX_TOTAL_CHARS);
	}
	return clip((options.fileContent || "").trim(), MAX_TOTAL_CHARS);
}

function questionTextFromUnknown(item: unknown): string {
	if (typeof item === "string") return item.trim();
	if (!item || typeof item !== "object") return "";
	const row = item as Record<string, unknown>;
	// Models sometimes return starter-shaped objects instead of plain strings
	for (const key of ["prompt", "question", "text", "label"] as const) {
		const value = row[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return "";
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
	if (!Array.isArray(value)) return fallback;
	return value.map(questionTextFromUnknown).filter(Boolean);
}

export function parseCitations(raw: unknown): ContractCitation[] {
	if (!Array.isArray(raw)) return [];
	const citations: ContractCitation[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const id = Number(row.id);
		if (!Number.isFinite(id) || id <= 0) continue;
		const pages = Array.isArray(row.pages)
			? row.pages
					.map((page) => Number(page))
					.filter((page) => Number.isInteger(page) && page > 0)
			: [];
		const quote = typeof row.quote === "string" ? row.quote.trim() : "";
		citations.push({ id, pages, quote });
	}
	return citations;
}

export function parseStarterPrompts(raw: unknown): ContractStarterPrompt[] {
	if (!Array.isArray(raw)) return [];
	const prompts: ContractStarterPrompt[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const label = typeof row.label === "string" ? row.label.trim() : "";
		const prompt = typeof row.prompt === "string" ? row.prompt.trim() : "";
		if (!label || !prompt) continue;
		prompts.push({ label, prompt });
	}
	return prompts.slice(0, 4);
}

export function parseContractAssistantJson(raw: string): {
	answerMarkdown: string;
	summaryMarkdown: string;
	citations: ContractCitation[];
	suggestedQuestions: string[];
	starterPrompts: ContractStarterPrompt[];
} {
	let parsed: Record<string, unknown> = {};
	try {
		parsed = JSON.parse(extractJsonObjectFromModelText(raw)) as Record<
			string,
			unknown
		>;
	} catch {
		parsed = {};
	}

	const markdown =
		(typeof parsed.answerMarkdown === "string" &&
			parsed.answerMarkdown.trim()) ||
		(typeof parsed.summaryMarkdown === "string" &&
			parsed.summaryMarkdown.trim()) ||
		"";

	return {
		answerMarkdown: markdown,
		summaryMarkdown: markdown,
		citations: parseCitations(parsed.citations),
		suggestedQuestions: asStringArray(parsed.suggestedQuestions, []).slice(0, 3),
		starterPrompts: parseStarterPrompts(parsed.starterPrompts),
	};
}

function groundingRules(): string {
	return `Hard rules:
- Use only the provided contract text. Do not invent parties, dates, amounts, FAR/NIST/DFARS clauses, or deadlines.
- If a fact is missing, say it is not stated in the document.
- Format answerMarkdown as clean GitHub-flavored markdown with real newline characters (\\n).
- Start with one short bold title line, then one bullet per fact on its own line: "- **Label:** value".
- Never place multiple bullets on the same line. Never use " * " as an inline separator.
- Do not wrap dates, IDs, or plain values in quotation marks unless you are quoting the document verbatim.
- Prefer scannable bullets over long paragraphs.
- Insert citation markers like [1] immediately after claims that quote the document.
- citations[].id must match those markers. pages[] must be page numbers from [[PAGE:N]] markers when present; otherwise use an empty pages array and still include a short quote.
- suggestedQuestions must be 3 short, document-specific follow-up questions. Never reuse generic questions like "What is this document about?"
- starterPrompts must be 4 items with a short label (verb + noun) and a full prompt grounded in this contract.`;
}

function fallbackAnalyze(fileName: string): ContractAssistantAnalyzeResult {
	return {
		summaryMarkdown: `Unable to analyze **${fileName}** right now. Review the contract text directly, then try again.`,
		starterPrompts: CONTRACT_ASSISTANT_FALLBACK_STARTERS,
		suggestedQuestions: CONTRACT_ASSISTANT_FALLBACK_QUESTIONS,
		citations: [],
	};
}

function fallbackAnswer(): ContractAssistantAnswerResult {
	return {
		answerMarkdown:
			"I could not complete that analysis from the contract text. Try a more specific clause, date, or party name.",
		citations: [],
		suggestedQuestions: CONTRACT_ASSISTANT_FALLBACK_QUESTIONS,
	};
}

export async function analyzeContractDocument(options: {
	fileName: string;
	pageTexts?: PdfPageText[];
	fileContent?: string;
}): Promise<ContractAssistantAnalyzeResult> {
	const corpus = buildContractCorpus(options);
	if (!apiKey || !corpus) {
		return fallbackAnalyze(options.fileName);
	}

	const prompt = `You are CAALM's contract assistant for nonprofit / government / vendor agreements.
Analyze this contract and return JSON only:
{
  "summaryMarkdown": "GitHub-flavored markdown summary with numbered sections",
  "starterPrompts": [{"label":"...", "prompt":"..."}],
  "suggestedQuestions": ["...", "...", "..."],
  "citations": [{"id":1,"pages":[1],"quote":"..."}]
}

${groundingRules()}

Document name: ${options.fileName}

Contract text:
${corpus}`;

	try {
		const result = await jsonModel.generateContent(prompt);
		const parsed = parseContractAssistantJson(result.response.text() || "");
		return {
			summaryMarkdown:
				parsed.summaryMarkdown ||
				fallbackAnalyze(options.fileName).summaryMarkdown,
			// Empty when the model omits them — do not inject static starters/questions
			starterPrompts: parsed.starterPrompts,
			suggestedQuestions: parsed.suggestedQuestions,
			citations: parsed.citations,
		};
	} catch (error) {
		console.error("analyzeContractDocument error:", error);
		return fallbackAnalyze(options.fileName);
	}
}

export async function answerContractQuestion(options: {
	question: string;
	fileName: string;
	pageTexts?: PdfPageText[];
	fileContent?: string;
	previousContext?: string;
}): Promise<ContractAssistantAnswerResult> {
	const corpus = buildContractCorpus(options);
	if (!apiKey || !corpus) {
		return fallbackAnswer();
	}

	const contextBlock = options.previousContext
		? `Previous conversation:\n${options.previousContext}\n\n`
		: "";

	const prompt = `You are CAALM's contract assistant. Answer the user's question using only this contract.
Return JSON only:
{
  "answerMarkdown": "**Short title grounded in this document**\\n\\n- **Label:** value from this document\\n- **Label:** value from this document",
  "citations": [{"id":1,"pages":[2],"quote":"..."}],
  "suggestedQuestions": ["...", "...", "..."]
}

Derive the title, labels, and values only from the contract text and the user's question. Do not reuse sample labels, IDs, or dates from this prompt.

${groundingRules()}

${contextBlock}Document name: ${options.fileName}

Question: ${options.question}

Contract text:
${corpus}`;

	try {
		const result = await jsonModel.generateContent(prompt);
		const parsed = parseContractAssistantJson(result.response.text() || "");
		return {
			answerMarkdown: parsed.answerMarkdown || fallbackAnswer().answerMarkdown,
			citations: parsed.citations,
			suggestedQuestions: parsed.suggestedQuestions,
		};
	} catch (error) {
		console.error("answerContractQuestion error:", error);
		return fallbackAnswer();
	}
}
