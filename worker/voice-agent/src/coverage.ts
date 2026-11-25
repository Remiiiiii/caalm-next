/**
 * Mirrors `src/lib/audit-lab/voice/coverage.ts` — keep in sync by hand (this
 * package has no dependency on the Next.js app source).
 */

export const VOICE_COVERAGE_TOPIC = "audit-lab.coverage";

export type AnswerQuality = "strong" | "adequate" | "weak";

export type CoverageItemStatus = "covered" | "current" | "remaining";

export type CoverageSnapshotItem = {
	questionId: string;
	prompt: string;
	status: CoverageItemStatus;
	requiresEvidence: boolean;
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
}): CoverageSnapshot {
	const coveredSet = new Set(params.coveredIds);
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
		return {
			questionId: r.questionId,
			prompt: r.prompt,
			status,
			requiresEvidence: r.requiresEvidence ?? false,
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
