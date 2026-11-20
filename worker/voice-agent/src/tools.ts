import { tool } from "@livekit/agents";
import { z } from "zod";
import { recordTurn } from "./callback.js";
import {
	type AnswerQuality,
	buildCoverageSnapshot,
	type CoverageSnapshot,
	pickNextRubricItem,
	VOICE_COVERAGE_TOPIC,
} from "./coverage.js";
import type { VoiceRubricItem } from "./types.js";

export type SessionUserData = {
	attemptId: string;
	rubric: VoiceRubricItem[];
	covered: Set<string>;
	currentQuestionId: string | null;
	publishCoverage: (snapshot: CoverageSnapshot) => Promise<void>;
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

async function publishUserCoverage(userData: SessionUserData): Promise<void> {
	const snapshot = buildCoverageSnapshot({
		rubric: userData.rubric,
		coveredIds: userData.covered,
		currentQuestionId: userData.currentQuestionId,
	});
	await userData.publishCoverage(snapshot);
}

const recordResponseSchema = z.object({
	questionId: z
		.string()
		.describe("The questionId of the rubric item just answered."),
	answerSummary: z
		.string()
		.describe("A concise summary of what the interviewee said."),
	answerQuality: z
		.enum(["strong", "adequate", "weak"])
		.describe(
			"How solid the answer was: strong (specific + evidence), adequate (usable), weak (vague).",
		),
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
				"Call this once the interviewee has given a real answer to the current rubric question. Persists the turn and moves on to the next uncovered rubric item (order adapts to answer quality).",
			parameters: recordResponseSchema,
			execute: async (args, opts) => {
				const userData = opts.ctx.userData;
				const { rubric, attemptId, covered } = userData;
				const item = requireRubricItem(rubric, args.questionId);
				covered.add(args.questionId);
				const quality = args.answerQuality as AnswerQuality;
				await recordTurn({
					attemptId,
					questionId: item.questionId,
					question: item.prompt,
					answer: args.answerSummary,
					citedEvidence: args.citedEvidence,
					answerQuality: quality,
				});
				const remaining = rubric.filter(
					(r: VoiceRubricItem) => !covered.has(r.questionId),
				);
				const next = pickNextRubricItem(remaining, quality);
				userData.currentQuestionId = next?.questionId ?? null;
				await publishUserCoverage(userData);
				if (!next) {
					return "That was the last rubric item. Wrap up and call conclude_interview.";
				}
				return `Recorded (${quality}). ${remaining.length} rubric item(s) left. Next, ask about: "${next.prompt}" (questionId: ${next.questionId}). Ask that prompt next — do not invent a different question.`;
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
				const userData = opts.ctx.userData;
				const { rubric } = userData;
				requireRubricItem(rubric, args.questionId);
				userData.currentQuestionId = args.questionId;
				await publishUserCoverage(userData);
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
				const userData = opts.ctx.userData;
				userData.currentQuestionId = null;
				await publishUserCoverage(userData);
				await opts.ctx.session.close();
				return "Interview concluded.";
			},
		}),
	};
}

export { VOICE_COVERAGE_TOPIC };
