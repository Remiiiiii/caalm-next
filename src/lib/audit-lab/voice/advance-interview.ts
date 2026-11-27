/**
 * Shared next-question advance helpers for Nuance (browser) and tests.
 * LiveKit worker keeps a mirror in worker/voice-agent/src/tools.ts.
 */

import {
	type AnswerQuality,
	buildCoverageSnapshot,
	type CoverageSnapshot,
	evaluateAdvanceGate,
	isAnswerAccepted,
	MAX_QUESTION_FAILED_ATTEMPTS,
	pickNextRubricItem,
} from "@/lib/audit-lab/voice/coverage";

export type InterviewRubricItem = {
	questionId: string;
	prompt: string;
	difficulty: string;
	requiresEvidence?: boolean;
};

export type InterviewAdvanceState = {
	rubric: InterviewRubricItem[];
	covered: Set<string>;
	currentQuestionId: string | null;
	documented: Set<string>;
	attachOpen: Set<string>;
	failedAttempts: Map<string, number>;
	/**
	 * Questions the auditor finished asking with enough spoken time.
	 * Attach stays locked until the current id is in this set.
	 */
	posed: Set<string>;
};

export function createEmptyInterviewState(
	rubric: InterviewRubricItem[] = [],
	currentQuestionId: string | null = null,
): InterviewAdvanceState {
	return {
		rubric,
		covered: new Set(),
		currentQuestionId,
		documented: new Set(),
		attachOpen: new Set(),
		failedAttempts: new Map(),
		posed: new Set(),
	};
}

export function buildInterviewCoverage(
	state: InterviewAdvanceState,
): CoverageSnapshot {
	return buildCoverageSnapshot({
		rubric: state.rubric,
		coveredIds: state.covered,
		currentQuestionId: state.currentQuestionId,
		documentedIds: state.documented,
		attachOpenIds: state.attachOpen,
	});
}

/**
 * Mark the current evidence question as fully asked, then unlock the
 * pulsating paperclip. Call only after the auditor spoke long enough.
 */
export function unlockAttachAfterAuditorFinishedAsking(
	state: InterviewAdvanceState,
): boolean {
	const qid = state.currentQuestionId;
	if (!qid || state.covered.has(qid)) return false;
	const item = state.rubric.find((r) => r.questionId === qid);
	if (!item?.requiresEvidence) return false;
	state.posed.add(qid);
	if (state.documented.has(qid)) return false;
	if (state.attachOpen.has(qid)) return false;
	state.attachOpen.add(qid);
	return true;
}

/** @deprecated Prefer unlockAttachAfterAuditorFinishedAsking after a real ask. */
export function openAttachForCurrentQuestion(
	state: InterviewAdvanceState,
): boolean {
	const qid = state.currentQuestionId;
	if (!qid || !state.posed.has(qid)) return false;
	return unlockAttachAfterAuditorFinishedAsking(state);
}

export function markEvidenceAttached(
	state: InterviewAdvanceState,
	questionId: string,
): boolean {
	if (!questionId) return false;
	state.documented.add(questionId);
	// Keep attachOpen so they can replace the file until the auditor accepts or advances.
	return true;
}

/**
 * Wrong file: clear the “good document” flag and reopen the paperclip so they
 * can upload a different file while staying on the same question.
 */
export function reopenAttachAfterRejectedEvidence(
	state: InterviewAdvanceState,
	questionId: string,
): boolean {
	if (!questionId) return false;
	state.documented.delete(questionId);
	if (state.covered.has(questionId)) return false;
	if (state.currentQuestionId !== questionId) return false;
	const item = state.rubric.find((r) => r.questionId === questionId);
	if (!item?.requiresEvidence) return false;
	state.posed.add(questionId);
	state.attachOpen.add(questionId);
	return true;
}

function bumpFailedAttempts(
	state: InterviewAdvanceState,
	questionId: string,
): number {
	const next = (state.failedAttempts.get(questionId) ?? 0) + 1;
	state.failedAttempts.set(questionId, next);
	return next;
}

function moveToNext(
	state: InterviewAdvanceState,
	answeredQuestionId: string,
	quality: AnswerQuality,
): { next: InterviewRubricItem | null; remaining: number } {
	state.covered.add(answeredQuestionId);
	state.attachOpen.delete(answeredQuestionId);
	const remainingItems = state.rubric.filter(
		(r) => !state.covered.has(r.questionId),
	);
	const next = pickNextRubricItem(remainingItems, quality);
	state.currentQuestionId = next?.questionId ?? null;
	// Next question starts locked until the auditor finishes asking it.
	if (next) state.attachOpen.delete(next.questionId);
	return { next, remaining: remainingItems.length };
}

export type AdvanceDecision =
	| {
			action: "blocked";
			message: string;
	  }
	| {
			action: "advance";
			message: string;
			quality: AnswerQuality;
			persistAnswer: boolean;
	  };

/**
 * Decide whether record_response_and_advance may persist + move on.
 * Caller persists the turn when action === "advance" && persistAnswer.
 */
export function decideRecordAndAdvance(
	state: InterviewAdvanceState,
	args: {
		questionId: string;
		answerQuality: AnswerQuality;
		evidenceAccepted?: boolean;
	},
): AdvanceDecision {
	const item = state.rubric.find((r) => r.questionId === args.questionId);
	if (!item) {
		return {
			action: "blocked",
			message: `Unknown questionId "${args.questionId}".`,
		};
	}

	const failedAttempts = state.failedAttempts.get(args.questionId) ?? 0;
	const gate = evaluateAdvanceGate({
		requiresEvidence: Boolean(item.requiresEvidence),
		hasDocument: state.documented.has(args.questionId),
		failedAttempts,
		answerAccepted: isAnswerAccepted(args.answerQuality),
		evidenceAccepted: args.evidenceAccepted,
	});

	if (!gate.ok) {
		if (gate.countAsFailure) {
			const count = bumpFailedAttempts(state, args.questionId);
			if (
				args.evidenceAccepted === false &&
				count < MAX_QUESTION_FAILED_ATTEMPTS
			) {
				reopenAttachAfterRejectedEvidence(state, args.questionId);
			}
			if (count >= MAX_QUESTION_FAILED_ATTEMPTS) {
				const { next, remaining } = moveToNext(
					state,
					args.questionId,
					args.answerQuality,
				);
				if (!next) {
					return {
						action: "advance",
						quality: args.answerQuality,
						persistAnswer: true,
						message:
							"That was the last rubric item after 2 failed attempts. Thank them briefly and end the call now (end_call / conclude_interview).",
					};
				}
				return {
					action: "advance",
					quality: args.answerQuality,
					persistAnswer: true,
					message: `Recorded after 2 failed attempts. ${remaining} rubric item(s) left. Next, ask about: "${next.prompt}" (questionId: ${next.questionId}).`,
				};
			}
			return {
				action: "blocked",
				message: `${gate.message} (Failed attempt ${count}/2.)`,
			};
		}
		return { action: "blocked", message: gate.message };
	}

	const { next, remaining } = moveToNext(
		state,
		args.questionId,
		args.answerQuality,
	);
	if (!next) {
		return {
			action: "advance",
			quality: args.answerQuality,
			persistAnswer: true,
			message:
				"That was the last rubric item. Thank them briefly and end the call now (end_call / conclude_interview).",
		};
	}
	return {
		action: "advance",
		quality: args.answerQuality,
		persistAnswer: true,
		message: `Recorded (${args.answerQuality}). ${remaining} rubric item(s) left. Next, ask about: "${next.prompt}" (questionId: ${next.questionId}).`,
	};
}

export function decideSkipQuestion(
	state: InterviewAdvanceState,
	args: { questionId: string; reason: string },
): AdvanceDecision {
	const item = state.rubric.find((r) => r.questionId === args.questionId);
	if (!item) {
		return {
			action: "blocked",
			message: `Unknown questionId "${args.questionId}".`,
		};
	}
	const gate = evaluateAdvanceGate({
		requiresEvidence: Boolean(item.requiresEvidence),
		hasDocument: state.documented.has(args.questionId),
		failedAttempts: state.failedAttempts.get(args.questionId) ?? 0,
		answerAccepted: false,
		skippedByInterviewee: true,
	});
	if (!gate.ok) {
		return { action: "blocked", message: gate.message };
	}
	const { next, remaining } = moveToNext(state, args.questionId, "weak");
	if (!next) {
		return {
			action: "advance",
			quality: "weak",
			persistAnswer: true,
			message:
				"Skipped. That was the last rubric item. Thank them briefly and end the call now (end_call / conclude_interview).",
		};
	}
	return {
		action: "advance",
		quality: "weak",
		persistAnswer: true,
		message: `Skipped (${args.reason}). ${remaining} rubric item(s) left. Next, ask about: "${next.prompt}" (questionId: ${next.questionId}).`,
	};
}
