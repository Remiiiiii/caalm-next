/**
 * Mirrors `src/lib/audit-lab/voice/coverage.ts` — keep in sync by hand (this
 * package has no dependency on the Next.js app source).
 */

export const VOICE_COVERAGE_TOPIC = "audit-lab.coverage";

/** Client → worker: evidence file finished scanning clean for a question. */
export const VOICE_EVIDENCE_ATTACHED_TOPIC = "audit-lab.evidence-attached";

export const MAX_QUESTION_FAILED_ATTEMPTS = 2;

/** Ignore short speaking blips so attach stays locked until a real ask finishes. */
export const MIN_AUDITOR_QUESTION_SPEAK_MS = 2500;

export type AnswerQuality = "strong" | "adequate" | "weak";

export type CoverageItemStatus = "covered" | "current" | "remaining";

export type CoverageSnapshotItem = {
	questionId: string;
	prompt: string;
	status: CoverageItemStatus;
	requiresEvidence: boolean;
	hasDocument: boolean;
	attachOpen: boolean;
};

export type CoverageSnapshot = {
	coveredIds: string[];
	remainingIds: string[];
	currentQuestionId: string | null;
	total: number;
	items: CoverageSnapshotItem[];
};

export type RubricPickItem = {
	questionId: string;
	prompt: string;
	difficulty: string;
};

export function difficultyRank(difficulty: string): number {
	const key = difficulty.trim().toLowerCase();
	if (key === "hard" || key === "high" || key === "advanced") return 3;
	if (key === "medium" || key === "med" || key === "moderate") return 2;
	if (key === "easy" || key === "low" || key === "beginner") return 1;
	return 2;
}

export function pickNextRubricItem<T extends RubricPickItem>(
	remaining: T[],
	answerQuality: AnswerQuality,
): T | null {
	if (remaining.length === 0) return null;
	if (remaining.length === 1) return remaining[0];

	const sorted = [...remaining].sort(
		(a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty),
	);

	switch (answerQuality) {
		case "strong":
			return sorted[sorted.length - 1];
		case "weak":
			return sorted[0];
		case "adequate": {
			const mid = Math.floor((sorted.length - 1) / 2);
			return sorted[mid];
		}
		default: {
			const _exhaustive: never = answerQuality;
			return _exhaustive;
		}
	}
}

export function buildCoverageSnapshot(params: {
	rubric: Array<{
		questionId: string;
		prompt: string;
		requiresEvidence?: boolean;
	}>;
	coveredIds: Iterable<string>;
	currentQuestionId: string | null;
	documentedIds?: Iterable<string>;
	attachOpenIds?: Iterable<string>;
}): CoverageSnapshot {
	const coveredSet = new Set(params.coveredIds);
	const documentedSet = new Set(params.documentedIds ?? []);
	const attachOpenSet = new Set(params.attachOpenIds ?? []);
	const coveredIds = params.rubric
		.map((r) => r.questionId)
		.filter((id) => coveredSet.has(id));
	const remainingIds = params.rubric
		.map((r) => r.questionId)
		.filter((id) => !coveredSet.has(id));
	const items: CoverageSnapshotItem[] = params.rubric.map((r) => {
		let status: CoverageItemStatus = "remaining";
		if (coveredSet.has(r.questionId)) status = "covered";
		else if (r.questionId === params.currentQuestionId) status = "current";
		const requiresEvidence = r.requiresEvidence ?? false;
		const hasDocument = documentedSet.has(r.questionId);
		// Keep attach open after a first upload so they can replace until accepted/advanced.
		const attachOpen =
			requiresEvidence &&
			status === "current" &&
			attachOpenSet.has(r.questionId);
		return {
			questionId: r.questionId,
			prompt: r.prompt,
			status,
			requiresEvidence,
			hasDocument,
			attachOpen,
		};
	});
	return {
		coveredIds,
		remainingIds,
		currentQuestionId: params.currentQuestionId,
		total: params.rubric.length,
		items,
	};
}

export type AdvanceGateInput = {
	requiresEvidence: boolean;
	hasDocument: boolean;
	failedAttempts: number;
	skippedByInterviewee?: boolean;
	answerAccepted: boolean;
	evidenceAccepted?: boolean;
};

export type AdvanceGateResult =
	| {
			ok: true;
			reason:
				| "no_evidence_required"
				| "reviewed_ok"
				| "max_failures"
				| "skipped";
	  }
	| {
			ok: false;
			reason: "awaiting_evidence" | "needs_retry";
			message: string;
			countAsFailure: boolean;
	  };

export function evaluateAdvanceGate(
	input: AdvanceGateInput,
): AdvanceGateResult {
	if (input.skippedByInterviewee) {
		return { ok: true, reason: "skipped" };
	}
	if (input.failedAttempts >= MAX_QUESTION_FAILED_ATTEMPTS) {
		return { ok: true, reason: "max_failures" };
	}

	if (!input.answerAccepted) {
		return {
			ok: false,
			reason: "needs_retry",
			countAsFailure: true,
			message:
				"That answer was not accurate enough. Ask one short follow-up. Do not move to the next rubric item yet.",
		};
	}

	if (!input.requiresEvidence) {
		return { ok: true, reason: "no_evidence_required" };
	}

	if (!input.hasDocument) {
		return {
			ok: false,
			reason: "awaiting_evidence",
			countAsFailure: false,
			message:
				"This question needs supporting evidence. Wait for an attachment, or if they say they have none and want to move on, call skip_current_question. Do not ask the next rubric item yet.",
		};
	}

	if (input.evidenceAccepted === false) {
		return {
			ok: false,
			reason: "needs_retry",
			countAsFailure: true,
			message:
				"The attached evidence does not match. Tell them the paperclip is open again so they can upload a different file, or call skip_current_question if they want to move on. Do not ask the next rubric item yet.",
		};
	}

	return { ok: true, reason: "reviewed_ok" };
}

export function isAnswerAccepted(quality: AnswerQuality): boolean {
	return quality === "strong" || quality === "adequate";
}
