import { tool } from "@livekit/agents";
import { z } from "zod";
import { recordTurn } from "./callback.js";
import type { VoiceRubricItem } from "./types.js";

export type SessionUserData = {
	attemptId: string;
	rubric: VoiceRubricItem[];
	covered: Set<string>;
};

/** Guardrail: reject a questionId the agent didn't actually get from the rubric. */
function requireRubricItem(
	rubric: VoiceRubricItem[],
	questionId: string,
): VoiceRubricItem {
	const item = rubric.find((r) => r.questionId === questionId);
	if (!item) {
		throw new Error(
			`Unknown questionId "${questionId}" — it must be one of the rubric's real question IDs.`,
		);
	}
	return item;
}

const recordResponseSchema = z.object({
	questionId: z
		.string()
		.describe("The questionId of the rubric item just answered."),
	answerSummary: z
		.string()
		.describe("A concise summary of what the interviewee said."),
	citedEvidence: z
		.string()
		.optional()
		.describe(
			"A specific record/log/document the interviewee pointed to, if any.",
		),
});

const flagClarificationSchema = z.object({
	questionId: z.string(),
	reason: z.string().describe("Why the answer needs clarification."),
});

const concludeInterviewSchema = z.object({
	reason: z.string(),
});

export function buildInterviewTools() {
	return {
		record_response_and_advance: tool<
			SessionUserData,
			typeof recordResponseSchema,
			string
		>({
			description:
				"Call this once the interviewee has given a real answer to the current rubric question. Persists the turn and moves on to the next uncovered rubric item.",
			parameters: recordResponseSchema,
			execute: async (args, opts) => {
				const { rubric, attemptId, covered } = opts.ctx.userData;
				const item = requireRubricItem(rubric, args.questionId);
				covered.add(args.questionId);
				await recordTurn({
					attemptId,
					questionId: item.questionId,
					question: item.prompt,
					answer: args.answerSummary,
					citedEvidence: args.citedEvidence,
				});
				const remaining = rubric.filter(
					(r: VoiceRubricItem) => !covered.has(r.questionId),
				);
				if (remaining.length === 0) {
					return "That was the last rubric item. Wrap up and call conclude_interview.";
				}
				return `Recorded. ${remaining.length} rubric item(s) left. Next, ask about: "${remaining[0].prompt}"`;
			},
		}),

		flag_clarification_needed: tool<
			SessionUserData,
			typeof flagClarificationSchema,
			string
		>({
			description:
				"Call this instead of record_response_and_advance when the interviewee's answer was too vague to grade — ask ONE bounded follow-up, then try recording again.",
			parameters: flagClarificationSchema,
			execute: async (args, opts) => {
				const { rubric } = opts.ctx.userData;
				requireRubricItem(rubric, args.questionId);
				return `Ask a single, specific follow-up addressing: ${args.reason}. Do not move to a new rubric item yet.`;
			},
		}),

		conclude_interview: tool<
			SessionUserData,
			typeof concludeInterviewSchema,
			string
		>({
			description:
				"Call this once every rubric item is covered (or the interviewee needs to stop) to end the call politely.",
			parameters: concludeInterviewSchema,
			execute: async (_args, opts) => {
				await opts.ctx.session.close();
				return "Interview concluded.";
			},
		}),
	};
}
