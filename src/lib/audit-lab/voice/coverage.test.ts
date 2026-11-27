import { describe, expect, it } from "vitest";
import {
	buildCoverageSnapshot,
	difficultyRank,
	evaluateAdvanceGate,
	isAnswerAccepted,
	isAttachControlVisible,
	MAX_QUESTION_FAILED_ATTEMPTS,
	pickNextRubricItem,
	scorecardToPracticeReadinessPct,
} from "./coverage";

const rubric = [
	{ questionId: "q-easy", prompt: "Easy one", difficulty: "easy" },
	{ questionId: "q-med", prompt: "Medium one", difficulty: "medium" },
	{ questionId: "q-hard", prompt: "Hard one", difficulty: "hard" },
];

describe("difficultyRank", () => {
	it("orders easy < medium < hard", () => {
		expect(difficultyRank("easy")).toBeLessThan(difficultyRank("medium"));
		expect(difficultyRank("medium")).toBeLessThan(difficultyRank("hard"));
	});
});

describe("pickNextRubricItem", () => {
	it("returns null when nothing remains", () => {
		expect(pickNextRubricItem([], "strong")).toBeNull();
	});

	it("prefers harder items after a strong answer", () => {
		const next = pickNextRubricItem(rubric, "strong");
		expect(next?.questionId).toBe("q-hard");
	});

	it("prefers easier items after a weak answer", () => {
		const next = pickNextRubricItem(rubric, "weak");
		expect(next?.questionId).toBe("q-easy");
	});

	it("picks a mid band after an adequate answer", () => {
		const next = pickNextRubricItem(rubric, "adequate");
		expect(next?.questionId).toBe("q-med");
	});

	it("never invents an id outside the remaining list", () => {
		const remaining = [rubric[0], rubric[2]];
		const next = pickNextRubricItem(remaining, "strong");
		expect(remaining.map((r) => r.questionId)).toContain(next?.questionId);
	});
});

describe("buildCoverageSnapshot", () => {
	it("marks covered / current / remaining", () => {
		const snapshot = buildCoverageSnapshot({
			rubric,
			coveredIds: ["q-easy"],
			currentQuestionId: "q-med",
		});
		expect(snapshot.total).toBe(3);
		expect(snapshot.coveredIds).toEqual(["q-easy"]);
		expect(snapshot.remainingIds).toEqual(["q-med", "q-hard"]);
		expect(snapshot.items.find((i) => i.questionId === "q-easy")?.status).toBe(
			"covered",
		);
		expect(snapshot.items.find((i) => i.questionId === "q-med")?.status).toBe(
			"current",
		);
		expect(snapshot.items.find((i) => i.questionId === "q-hard")?.status).toBe(
			"remaining",
		);
	});

	it("defaults hasDocument to false when documentedIds is omitted", () => {
		const snapshot = buildCoverageSnapshot({
			rubric,
			coveredIds: ["q-easy"],
			currentQuestionId: null,
		});
		expect(snapshot.items.every((i) => i.hasDocument === false)).toBe(true);
	});

	it("flags hasDocument only for questionIds present in documentedIds", () => {
		const snapshot = buildCoverageSnapshot({
			rubric,
			coveredIds: ["q-easy", "q-med"],
			currentQuestionId: null,
			documentedIds: ["q-easy"],
		});
		expect(snapshot.items.find((i) => i.questionId === "q-easy")?.hasDocument).toBe(
			true,
		);
		expect(snapshot.items.find((i) => i.questionId === "q-med")?.hasDocument).toBe(
			false,
		);
	});

	it("opens attach only for the current evidence item listed in attachOpenIds", () => {
		const withEvidence = [
			{ ...rubric[0], requiresEvidence: true },
			{ ...rubric[1], requiresEvidence: true },
			{ ...rubric[2], requiresEvidence: false },
		];
		const snapshot = buildCoverageSnapshot({
			rubric: withEvidence,
			coveredIds: [],
			currentQuestionId: "q-easy",
			attachOpenIds: ["q-easy", "q-med"],
		});
		expect(snapshot.items.find((i) => i.questionId === "q-easy")?.attachOpen).toBe(
			true,
		);
		// Listed in attachOpenIds but not current → still locked in the UI.
		expect(snapshot.items.find((i) => i.questionId === "q-med")?.attachOpen).toBe(
			false,
		);
		expect(snapshot.items.find((i) => i.questionId === "q-hard")?.attachOpen).toBe(
			false,
		);
	});

	it("keeps attachOpen after a document lands so they can replace it", () => {
		const withEvidence = [{ ...rubric[0], requiresEvidence: true }];
		const snapshot = buildCoverageSnapshot({
			rubric: withEvidence,
			coveredIds: [],
			currentQuestionId: "q-easy",
			attachOpenIds: ["q-easy"],
			documentedIds: ["q-easy"],
		});
		expect(snapshot.items[0]?.attachOpen).toBe(true);
		expect(snapshot.items[0]?.hasDocument).toBe(true);
	});
});

describe("isAttachControlVisible", () => {
	it("follows attachOpen even when a document is already present", () => {
		expect(isAttachControlVisible({ attachOpen: true, hasDocument: false })).toBe(
			true,
		);
		expect(isAttachControlVisible({ attachOpen: true, hasDocument: true })).toBe(
			true,
		);
		expect(isAttachControlVisible({ attachOpen: false, hasDocument: false })).toBe(
			false,
		);
	});
});

describe("evaluateAdvanceGate", () => {
	it("allows skip when the interviewee wants to move on", () => {
		const result = evaluateAdvanceGate({
			requiresEvidence: true,
			hasDocument: false,
			failedAttempts: 0,
			answerAccepted: false,
			skippedByInterviewee: true,
		});
		expect(result).toEqual({ ok: true, reason: "skipped" });
	});

	it("allows advance after max failed attempts", () => {
		const result = evaluateAdvanceGate({
			requiresEvidence: true,
			hasDocument: false,
			failedAttempts: MAX_QUESTION_FAILED_ATTEMPTS,
			answerAccepted: false,
		});
		expect(result).toEqual({ ok: true, reason: "max_failures" });
	});

	it("blocks evidence questions until a document lands", () => {
		const result = evaluateAdvanceGate({
			requiresEvidence: true,
			hasDocument: false,
			failedAttempts: 0,
			answerAccepted: true,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe("awaiting_evidence");
			expect(result.countAsFailure).toBe(false);
		}
	});

	it("counts a wrong answer or wrong evidence as a failed attempt", () => {
		const wrongAnswer = evaluateAdvanceGate({
			requiresEvidence: false,
			hasDocument: false,
			failedAttempts: 0,
			answerAccepted: false,
		});
		expect(wrongAnswer.ok).toBe(false);
		if (!wrongAnswer.ok) expect(wrongAnswer.countAsFailure).toBe(true);

		const wrongEvidence = evaluateAdvanceGate({
			requiresEvidence: true,
			hasDocument: true,
			failedAttempts: 0,
			answerAccepted: true,
			evidenceAccepted: false,
		});
		expect(wrongEvidence.ok).toBe(false);
		if (!wrongEvidence.ok) {
			expect(wrongEvidence.countAsFailure).toBe(true);
			expect(wrongEvidence.message).toMatch(/different file|paperclip/i);
		}
	});

	it("passes when answer and evidence are both accepted", () => {
		expect(
			evaluateAdvanceGate({
				requiresEvidence: true,
				hasDocument: true,
				failedAttempts: 0,
				answerAccepted: true,
				evidenceAccepted: true,
			}),
		).toEqual({ ok: true, reason: "reviewed_ok" });
	});
});

describe("isAnswerAccepted", () => {
	it("treats strong and adequate as accepted, weak as not", () => {
		expect(isAnswerAccepted("strong")).toBe(true);
		expect(isAnswerAccepted("adequate")).toBe(true);
		expect(isAnswerAccepted("weak")).toBe(false);
	});
});

describe("scorecardToPracticeReadinessPct", () => {
	it("averages covered / partial / not_covered into 0–100", () => {
		expect(
			scorecardToPracticeReadinessPct([
				{ verdict: "covered" },
				{ verdict: "partially_covered" },
				{ verdict: "not_covered" },
				{ verdict: "covered" },
			]),
		).toBe(63);
	});

	it("returns 0 for an empty scorecard", () => {
		expect(scorecardToPracticeReadinessPct([])).toBe(0);
	});
});
