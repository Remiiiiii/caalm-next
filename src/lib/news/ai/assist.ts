import { GoogleGenerativeAI } from "@google/generative-ai";

export function isNewsAiAssistEnabled(): boolean {
	return process.env.NEWS_AI_ASSIST_ENABLED === "true";
}

export type NewsAiAssistInput = {
	mode: "draft_from_text" | "summarize" | "suggest";
	text: string;
};

export type NewsAiAssistResult = {
	title: string;
	excerpt: string;
	suggestedType: "announcement" | "update" | "alert" | "info";
	suggestedDepartments: string[];
	aiGenerated: true;
};

function fallbackAssist(text: string): NewsAiAssistResult {
	const clean = text.replace(/\s+/g, " ").trim();
	const title = clean.slice(0, 80) || "Draft announcement";
	return {
		title,
		excerpt: clean.slice(0, 400),
		suggestedType: "info",
		suggestedDepartments: [],
		aiGenerated: true,
	};
}

export async function runNewsAiAssist(
	input: NewsAiAssistInput,
): Promise<NewsAiAssistResult> {
	const apiKey = process.env.GOOGLE_API_KEY;
	if (!apiKey) {
		return fallbackAssist(input.text);
	}

	const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
		model: "gemini-3.5-flash-lite",
		generationConfig: {
			responseMimeType: "application/json",
			temperature: 0.2,
			maxOutputTokens: 1024,
		},
	});

	try {
		const result = await model.generateContent(
			[
				"Return JSON with keys title, excerpt, suggestedType (announcement|update|alert|info), suggestedDepartments (string array). Never invent facts.",
				`${input.mode}: ${input.text.slice(0, 8000)}`,
			].join("\n\n"),
		);
		const text = result.response.text().trim();
		const start = text.indexOf("{");
		const end = text.lastIndexOf("}");
		const parsed = JSON.parse(
			start >= 0 && end > start ? text.slice(start, end + 1) : "{}",
		) as {
			title?: string;
			excerpt?: string;
			suggestedType?: NewsAiAssistResult["suggestedType"];
			suggestedDepartments?: string[];
		};
		const fallback = fallbackAssist(input.text);
		return {
			title: parsed.title || fallback.title,
			excerpt: parsed.excerpt || fallback.excerpt,
			suggestedType: parsed.suggestedType || "info",
			suggestedDepartments: Array.isArray(parsed.suggestedDepartments)
				? parsed.suggestedDepartments
				: [],
			aiGenerated: true,
		};
	} catch {
		return fallbackAssist(input.text);
	}
}
