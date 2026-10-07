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
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return fallbackAssist(input.text);
	}

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "gpt-4o-mini",
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content:
						'Return JSON with keys title, excerpt, suggestedType (announcement|update|alert|info), suggestedDepartments (string array). Never invent facts.',
				},
				{
					role: "user",
					content: `${input.mode}: ${input.text.slice(0, 8000)}`,
				},
			],
		}),
	});

	if (!response.ok) {
		return fallbackAssist(input.text);
	}

	const json = (await response.json()) as {
		choices?: Array<{ message?: { content?: string } }>;
	};
	try {
		const parsed = JSON.parse(json.choices?.[0]?.message?.content || "{}") as {
			title?: string;
			excerpt?: string;
			suggestedType?: NewsAiAssistResult["suggestedType"];
			suggestedDepartments?: string[];
		};
		return {
			title: parsed.title || fallbackAssist(input.text).title,
			excerpt: parsed.excerpt || fallbackAssist(input.text).excerpt,
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
