import { tool } from "@livekit/agents";
import { z } from "zod";
import { recordTurn } from "./callback.js";
import {
	type AnswerQuality,
	buildCoverageSnapshot,
	type CoverageSnapshot,
	evaluateAdvanceGate,
	isAnswerAccepted,
	MAX_QUESTION_FAILED_ATTEMPTS,
	pickNextRubricItem,
	VOICE_COVERAGE_TOPIC,
} from "./coverage.js";
import { buildInterviewWrapUpThinkingNote } from "./thinking-notes.js";
import type { VoiceRubricItem } from "./types.js";

export type SessionUserData = {
	attemptId: string;
	rubric: VoiceRubricItem[];
	covered: Set<string>;
	currentQuestionId: string | null;
	publishCoverage: (snapshot: CoverageSnapshot) => Promise<void>;
	/** Flipped by the room-metadata listener in `agent.ts` when the facilitator pauses/resumes. */
	paused: boolean;
	/** questionIds with a scanned-clean attachment this call. */
	documented: Set<string>;
	/** questionIds where attach is unlocked (auditor finished asking). */
	attachOpen: Set<string>;
	/** Wrong answer / wrong evidence counts per questionId. */
	failedAttempts: Map<string, number>;
	/** Questions the auditor finished asking with enough spoken time. */
	posed: Set<string>;
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

export async function publishUserCoverage(
	userData: SessionUserData,
): Promise<void> {
	const snapshot = buildCoverageSnapshot({
		rubric: userData.rubric,
		coveredIds: userData.covered,
		currentQuestionId: userData.currentQuestionId,
		documentedIds: userData.documented,
		attachOpenIds: userData.attachOpen,
	});
	await userData.publishCoverage(snapshot);
}

/** Unlock the paperclip after the auditor finishes asking the current evidence question. */
export async function unlockAttachAfterAuditorFinishedAsking(
	userData: SessionUserData,
): Promise<boolean> {
	const qid = userData.currentQuestionId;
	if (!qid || userData.covered.has(qid)) return false;
	const item = userData.rubric.find((r) => r.questionId === qid);
	if (!item?.requiresEvidence) return false;
	userData.posed.add(qid);
	if (userData.documented.has(qid)) return false;
	if (userData.attachOpen.has(qid)) return false;
	userData.attachOpen.add(qid);
	await publishUserCoverage(userData);
	return true;
}

/** @deprecated Prefer unlockAttachAfterAuditorFinishedAsking. */
export async function openAttachForCurrentQuestion(
	userData: SessionUserData,
): Promise<void> {
	await unlockAttachAfterAuditorFinishedAsking(userData);
}

function reopenAttachAfterRejectedEvidence(
	userData: SessionUserData,
	questionId: string,
): void {
	userData.documented.delete(questionId);
	if (userData.covered.has(questionId)) return;
	if (userData.currentQuestionId !== questionId) return;
	const item = userData.rubric.find((r) => r.questionId === questionId);
	if (!item?.requiresEvidence) return;
	userData.posed.add(questionId);
	userData.attachOpen.add(questionId);
}

function bumpFailedAttempts(
	userData: SessionUserData,
	questionId: string,
): number {
	const next = (userData.failedAttempts.get(questionId) ?? 0) + 1;
	userData.failedAttempts.set(questionId, next);
	return next;
}

async function advanceToNext(
	userData: SessionUserData,
	answeredQuestionId: string,
	quality: AnswerQuality,
): Promise<{ message: string; wrapUp: boolean }> {
	userData.covered.add(answeredQuestionId);
	userData.attachOpen.delete(answeredQuestionId);
	const remaining = userData.rubric.filter(
		(r: VoiceRubricItem) => !userData.covered.has(r.questionId),
	);
	const next = pickNextRubricItem(remaining, quality);
	userData.currentQuestionId = next?.questionId ?? null;
	// Next question starts locked until the auditor finishes asking it.
	if (next) userData.attachOpen.delete(next.questionId);
	await publishUserCoverage(userData);
	if (!next) {
		return {
			wrapUp: true,
			message:
				"That was the last rubric item. Thank them briefly and call conclude_interview now.",
		};
	}
	return {
		wrapUp: false,
		message: `Recorded (${quality}). ${remaining.length} rubric item(s) left. Next, ask about: "${next.prompt}" (questionId: ${next.questionId}). Ask that prompt next — do not invent a different question. Do not unlock attach yourself; the UI unlocks after you finish speaking the question.`,
	};
}

function nudgeWrapUp(session: {
	generateReply: (opts: {
		userInput: string;
		allowInterruptions?: boolean;
	}) => unknown;
}, userData: SessionUserData) {
	try {
		session.generateReply({
			userInput: buildInterviewWrapUpThinkingNote({
				coveredQuestionIds: [...userData.covered],
			}),
			allowInterruptions: true,
		});
	} catch (err) {
		console.error("[voice-agent] wrap-up generateReply failed", err);
	}
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
			"How solid the answer was: strong (specific + evidence), adequate (usable), weak (vague or wrong).",
		),
	citedEvidence: z
		.string()
		.optional()
		.describe(
			"A specific record/log/document the interviewee pointed to, if any.",
		),
	evidenceAccepted: z
		.boolean()
		.optional()
		.describe(
			"For questions that require a file: true if the attached evidence matches; false if the wrong file was attached. Omit when no file has landed yet.",
		),
});

const flagClarificationSchema = z.object({
	questionId: z.string(),
	reason: z.string().describe("Why the answer needs clarification."),
});

const skipQuestionSchema = z.object({
	questionId: z
		.string()
		.describe("The questionId the interviewee wants to leave behind."),
	reason: z
		.string()
		.describe(
			"Why they are moving on (e.g. no answer, no evidence available).",
		),
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
				"Call this once you have reviewed the interviewee's answer (and any attached evidence for evidence questions). Persists the turn and moves on only when the advance gate passes: reviewed accurate answer+evidence, 2 failed attempts, or use skip_current_question instead if they ask to move on without an answer.",
			parameters: recordResponseSchema,
			execute: async (args, opts) => {
				const userData = opts.ctx.userData;
				if (userData.paused) {
					return "The interview is paused right now. Wait silently — do not record this answer or ask another question until told to resume.";
				}
				const item = requireRubricItem(userData.rubric, args.questionId);
				const quality = args.answerQuality as AnswerQuality;
				const failedAttempts =
					userData.failedAttempts.get(args.questionId) ?? 0;
				const gate = evaluateAdvanceGate({
					requiresEvidence: item.requiresEvidence,
					hasDocument: userData.documented.has(args.questionId),
					failedAttempts,
					answerAccepted: isAnswerAccepted(quality),
					evidenceAccepted: args.evidenceAccepted,
				});

				if (!gate.ok) {
					if (gate.countAsFailure) {
						const count = bumpFailedAttempts(userData, args.questionId);
						if (
							args.evidenceAccepted === false &&
							count < MAX_QUESTION_FAILED_ATTEMPTS
						) {
							reopenAttachAfterRejectedEvidence(userData, args.questionId);
							await publishUserCoverage(userData);
						}
						if (count >= MAX_QUESTION_FAILED_ATTEMPTS) {
							await recordTurn({
								attemptId: userData.attemptId,
								questionId: item.questionId,
								question: item.prompt,
								answer: args.answerSummary,
								citedEvidence: args.citedEvidence,
								answerQuality: quality,
							});
							const advanced = await advanceToNext(
								userData,
								args.questionId,
								quality,
							);
							if (advanced.wrapUp) nudgeWrapUp(opts.ctx.session, userData);
							return advanced.message;
						}
						return `${gate.message} (Failed attempt ${count}/2.)`;
					}
					return gate.message;
				}

				await recordTurn({
					attemptId: userData.attemptId,
					questionId: item.questionId,
					question: item.prompt,
					answer: args.answerSummary,
					citedEvidence: args.citedEvidence,
					answerQuality: quality,
				});
				const advanced = await advanceToNext(
					userData,
					args.questionId,
					quality,
				);
				if (advanced.wrapUp) nudgeWrapUp(opts.ctx.session, userData);
				return advanced.message;
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
				if (userData.paused) {
					return "The interview is paused right now. Wait silently until told to resume.";
				}
				requireRubricItem(userData.rubric, args.questionId);
				userData.currentQuestionId = args.questionId;
				await publishUserCoverage(userData);
				return `Ask a single, specific follow-up addressing: ${args.reason}. Do not move to a new rubric item yet.`;
			},
		}),

		skip_current_question: tool<
			SessionUserData,
			typeof skipQuestionSchema,
			string
		>({
			description:
				"Call this when the interviewee says they have no answer and/or no evidence and want to move to the next question. Advances without requiring an attachment.",
			parameters: skipQuestionSchema,
			execute: async (args, opts) => {
				const userData = opts.ctx.userData;
				if (userData.paused) {
					return "The interview is paused right now. Wait silently until told to resume.";
				}
				const item = requireRubricItem(userData.rubric, args.questionId);
				const gate = evaluateAdvanceGate({
					requiresEvidence: item.requiresEvidence,
					hasDocument: userData.documented.has(args.questionId),
					failedAttempts: userData.failedAttempts.get(args.questionId) ?? 0,
					answerAccepted: false,
					skippedByInterviewee: true,
				});
				if (!gate.ok) {
					return gate.message;
				}
				await recordTurn({
					attemptId: userData.attemptId,
					questionId: item.questionId,
					question: item.prompt,
					answer: `Skipped by interviewee: ${args.reason}`,
					answerQuality: "weak",
				});
				const advanced = await advanceToNext(
					userData,
					args.questionId,
					"weak",
				);
				if (advanced.wrapUp) nudgeWrapUp(opts.ctx.session, userData);
				return advanced.message;
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
				userData.attachOpen.clear();
				await publishUserCoverage(userData);
				await opts.ctx.session.close();
				return "Interview concluded.";
			},
		}),
	};
}

export { VOICE_COVERAGE_TOPIC };
