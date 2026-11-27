/**
 * Phase 2 voice interview: adaptive next-question picking, live coverage
 * snapshots, attach unlock for evidence items, and scorecard → readiness %.
 */

export const VOICE_COVERAGE_TOPIC = "audit-lab.coverage";

/** Client → LiveKit worker: evidence file finished scanning clean for a question. */
export const VOICE_EVIDENCE_ATTACHED_TOPIC = "audit-lab.evidence-attached";

/** Wrong answer or wrong evidence can fail this many times before the auditor moves on. */
export const MAX_QUESTION_FAILED_ATTEMPTS = 2;

/**
 * Ignore short avatar “speaking” blips (connect chime / hello) so attach stays
 * locked until the auditor really finishes asking the current question.
 */
export const MIN_AUDITOR_QUESTION_SPEAK_MS = 2500;

export type AnswerQuality = "strong" | "adequate" | "weak";

export type CoverageItemStatus = "covered" | "current" | "remaining";

export type CoverageSnapshotItem = {
	questionId: string;
	prompt: string;
	status: CoverageItemStatus;
	/** Whether this item expects a supporting document — gates the attach control in the UI. */
	requiresEvidence: boolean;
	/** True once an attachment has actually landed for this question — a spoken answer alone never sets this. */
	hasDocument: boolean;
	/**
	 * True only after the auditor finished asking this evidence question and
	 * before a successful upload. Drives the pulsating paperclip (no lock icon).
	 */
	attachOpen: boolean;
};

export type CoverageSnapshot = {
	coveredIds: string[];
	remainingIds: string[];
	currentQuestionId: string | null;
	total: number;
	/** Rubric rows with live status for the mid-call checklist. */
	items: CoverageSnapshotItem[];
};

export type RubricPickItem = {
	questionId: string;
	prompt: string;
	difficulty: string;
};

/** Map free-form difficulty strings onto an ordered rank (higher = harder). */
export function difficultyRank(difficulty: string): number {
	const key = difficulty.trim().toLowerCase();
	if (key === "hard" || key === "high" || key === "advanced") return 3;
	if (key === "medium" || key === "med" || key === "moderate") return 2;
	if (key === "easy" || key === "low" || key === "beginner") return 1;
	return 2;
}

/**
 * Pick the next uncovered rubric item. After a strong answer prefer harder
 * remaining items; after weak prefer easier; adequate keeps a mid band.
 */
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
	/** questionIds with an attached, scanned-clean document — see RubricPanel's "document ✓ / statement only" chip. */
	documentedIds?: Iterable<string>;
	/**
	 * questionIds where attach is unlocked (auditor finished asking; waiting for
	 * evidence). Cleared once a document lands or the item is no longer current.
	 */
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
		// Paperclip stays while this evidence question is current and unlocked —
		// including after a first upload, so they can replace a rejected/unreviewed file.
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

/** True when the UI may offer attach/replace for this coverage row (pulsing paperclip). */
export function isAttachControlVisible(
	item: Pick<CoverageSnapshotItem, "attachOpen" | "hasDocument">,
): boolean {
	return item.attachOpen;
}

export type AdvanceGateInput = {
	requiresEvidence: boolean;
	hasDocument: boolean;
	failedAttempts: number;
	/** Interviewee asked to move on without an answer or evidence. */
	skippedByInterviewee?: boolean;
	/** Spoken answer graded usable (adequate or strong). Weak = not accepted. */
	answerAccepted: boolean;
	/**
	 * Auditor judged the attached file correct. Only checked when hasDocument.
	 * Omit or true when evidence looks right; false when the wrong file was attached.
	 */
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
			/** Bump the per-question failure counter when true. */
			countAsFailure: boolean;
	  };

/**
 * Whether the auditor may ask the next rubric question.
 * Pass when: reviewed answer (+ evidence if required), 2 failed attempts, or interviewee skip.
 */
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

/** Spoken quality that counts as a usable answer for advance review. */
export function isAnswerAccepted(quality: AnswerQuality): boolean {
	return quality === "strong" || quality === "adequate";
}

export type ScorecardVerdictItem = {
	verdict: "covered" | "partially_covered" | "not_covered" | string;
};

/** Average verdict weights → 0–100 integer for ReviewSession.practiceReadinessPct. */
export function scorecardToPracticeReadinessPct(
	items: ScorecardVerdictItem[],
): number {
	if (items.length === 0) return 0;
	let sum = 0;
	for (const item of items) {
		if (item.verdict === "covered") sum += 1;
		else if (item.verdict === "partially_covered") sum += 0.5;
	}
	return Math.round((sum / items.length) * 100);
}
