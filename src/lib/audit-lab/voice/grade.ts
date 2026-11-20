import Anthropic from "@anthropic-ai/sdk";
import { claudeModel } from "@/lib/assistant/claudeChat";
import type { VoiceRubricItem } from "./rubric";

export type VoiceGradedItem = {
	questionId: string;
	prompt: string;
	verdict: "covered" | "partially_covered" | "not_covered";
	rationale: string;
	/** Verbatim quote from the transcript backing this verdict, per the doc's "evidence-backed" requirement. */
	quote: string;
};

export type VoiceScorecard = {
	items: VoiceGradedItem[];
	overallSummary: string;
};

function getClient(): Anthropic {
	const apiKey = process.env.CLAUDE_API_KEY;
	if (!apiKey) throw new Error("CLAUDE_API_KEY is not configured");
	return new Anthropic({ apiKey });
}

/**
 * Grades a finished voice-interview transcript against the rubric, with every
 * verdict backed by a verbatim quote — never a bare score with no citation.
 */
export async function gradeVoiceTranscript(params: {
	rubric: VoiceRubricItem[];
	transcript: Array<{ questionId: string; question: string; answer: string }>;
}): Promise<VoiceScorecard> {
	const client = getClient();
	const prompt = `You are grading a mock-audit practice interview. For each rubric item, decide whether the interviewee's answers covered it, and quote the exact transcript text that supports your verdict. Never invent a quote — if nothing in the transcript supports an item, use verdict "not_covered" and an empty quote.

Rubric:
${JSON.stringify(
	params.rubric.map((r) => ({ questionId: r.questionId, prompt: r.prompt })),
	null,
	2,
)}

Transcript:
${JSON.stringify(params.transcript, null, 2)}

Respond with ONLY JSON of this exact shape, no prose outside the JSON:
{
  "items": [{ "questionId": "...", "prompt": "...", "verdict": "covered"|"partially_covered"|"not_covered", "rationale": "...", "quote": "..." }],
  "overallSummary": "..."
}`;

	const response = await client.messages.create({
		model: claudeModel(),
		max_tokens: 4000,
		messages: [{ role: "user", content: prompt }],
	});
	const text = response.content
		.filter((block): block is Anthropic.TextBlock => block.type === "text")
		.map((block) => block.text)
		.join("");
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end === -1) {
		return {
			items: params.rubric.map((r) => ({
				questionId: r.questionId,
				prompt: r.prompt,
				verdict: "not_covered",
				rationale: "Could not grade this transcript automatically.",
				quote: "",
			})),
			overallSummary: "Automatic grading failed — needs human review.",
		};
	}
	try {
		return JSON.parse(text.slice(start, end + 1)) as VoiceScorecard;
	} catch {
		return {
			items: params.rubric.map((r) => ({
				questionId: r.questionId,
				prompt: r.prompt,
				verdict: "not_covered",
				rationale: "Could not parse the grading response.",
				quote: "",
			})),
			overallSummary: "Automatic grading failed — needs human review.",
		};
	}
}
