import { describe, expect, it } from "vitest";
import {
	buildCoverageSnapshot,
	difficultyRank,
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
