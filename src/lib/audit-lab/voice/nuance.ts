import type { NuanceLiveTool } from "@nuancelabs/js-sdk";
import {
	type AuditorPersona,
	INTERVIEWER_PROFILES,
} from "@/lib/audit-lab/roleplay";
import type { VoiceRubricItem } from "@/lib/audit-lab/voice/rubric";

/**
 * Simone → mira, Valentina → sam. Note: per docs.nuancelabs.ai/personas,
 * sam and mira share the same voice (only sonia is distinct), so this
 * mapping gives both personas identical-sounding voices, differentiated
 * only by the system prompt's name and behavior below.
 */
export const NUANCE_PERSONA_BY_AUDITOR: Partial<
	Record<AuditorPersona, "sam" | "mira">
> = {
	friendly_collegiate: "mira",
	forensic: "sam",
};

export const NUANCE_RECORD_RESPONSE_TOOL = "record_response_and_advance";
export const NUANCE_FLAG_CLARIFICATION_TOOL = "flag_clarification_needed";

/**
 * The persona's own function tools, set at mint time via
 * `interface_setup.delegation.responses.tools` — calls dispatch to the page
 * through `conversation.onToolCall`, answered with `sendToolResult`. The
 * persona's built-in `end_call` runtime tool (enabled separately) replaces a
 * third custom "conclude_interview" tool.
 */
export const NUANCE_INTERVIEW_TOOLS: NuanceLiveTool[] = [
	{
		type: "function",
		name: NUANCE_RECORD_RESPONSE_TOOL,
		description:
			"Call this once the interviewee has given a real answer to the current rubric question. Persists the turn and returns the next rubric item to ask.",
		parameters: {
			type: "object",
			properties: {
				questionId: {
					type: "string",
					description: "The questionId of the rubric item just answered.",
				},
				answerSummary: {
					type: "string",
					description: "A concise summary of what the interviewee said.",
				},
				answerQuality: {
					type: "string",
					enum: ["strong", "adequate", "weak"],
					description:
						"How solid the answer was: strong (specific + evidence), adequate (usable), weak (vague).",
				},
				citedEvidence: {
					type: "string",
					description:
						"A specific record/log/document the interviewee pointed to, if any.",
				},
			},
			required: ["questionId", "answerSummary", "answerQuality"],
		},
	},
	{
		type: "function",
		name: NUANCE_FLAG_CLARIFICATION_TOOL,
		description:
			"Call this instead of record_response_and_advance when the interviewee's answer was too vague to grade — ask ONE bounded follow-up, then try recording again.",
		parameters: {
			type: "object",
			properties: {
				questionId: { type: "string" },
				reason: {
					type: "string",
					description: "Why the answer needs clarification.",
				},
			},
			required: ["questionId", "reason"],
		},
	},
];

/** Persona-specific behavior, translated from `INTERVIEWER_PROFILES[persona].desc` into concrete instructions for the interviewer's own hosted LLM. */
const BEHAVIOR_BY_AUDITOR: Partial<Record<AuditorPersona, string>> = {
	friendly_collegiate:
		"Keep your tone relaxed, warm and encouraging. When evidence is thin, nudge gently for more rather than pushing back hard — treat a weak or wrong answer as a chance to walk through it together, not a failure to call out.",
	forensic:
		"Stay precise and skeptical. Listen for gaps between the stated process and the evidence actually described. Follow up hard on anything vague — press for exact dates, system names, and specific examples rather than accepting a general timeline.",
};

/** Nuance's prompt/instructions length limits are shared with the platform's own text; keep well under its cap. */
const MAX_SYSTEM_PROMPT_CHARS = 4000;
const MAX_RUBRIC_ITEMS_IN_PROMPT = 25;

export function buildNuanceSystemPrompt({
	persona,
	sessionTitle,
	rubric,
}: {
	persona: AuditorPersona;
	sessionTitle: string;
	rubric: VoiceRubricItem[];
}): string {
	const profile = INTERVIEWER_PROFILES[persona];
	const behavior =
		BEHAVIOR_BY_AUDITOR[persona] ??
		"Ask every rubric question in order and follow up on vague answers.";
	const rubricList = rubric
		.slice(0, MAX_RUBRIC_ITEMS_IN_PROMPT)
		.map((r, i) => `${i + 1}. [${r.questionId}] ${r.prompt}`)
		.join("\n");
	const first = rubric[0];

	const prompt = `You are ${profile.name}, an AI auditor conducting a practice compliance interview for "${sessionTitle}". ${behavior}

Ask ONLY the questions listed below, one at a time, in a natural conversational voice — never invent a new criterion that isn't on this list.

Rubric (cover every item before concluding):
${rubricList}

Start with this first question (questionId: ${first?.questionId ?? ""}): "${first?.prompt ?? ""}"

Rules:
- After the interviewee answers, call record_response_and_advance with a concise summary, answerQuality (strong|adequate|weak), and any specific record/evidence they cited.
- If an answer is too vague to grade, call flag_clarification_needed instead and ask ONE bounded follow-up — never ask more than one clarification per item.
- Once every rubric item is recorded, thank them briefly and end the call.
- Keep your own turns short — this is a spoken conversation, not an essay.
- Speak only English. Never claim to be human, and never name the AI model or company behind you.`;

	return prompt.length > MAX_SYSTEM_PROMPT_CHARS
		? `${prompt.slice(0, MAX_SYSTEM_PROMPT_CHARS - 1)}…`
		: prompt;
}
