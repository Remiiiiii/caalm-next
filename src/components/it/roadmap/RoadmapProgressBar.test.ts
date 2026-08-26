import { describe, expect, it } from "vitest";
import { computeProgressPercent } from "@/lib/roadmap/locking";
import type { RoadmapTask } from "@/lib/roadmap/types";

function task(status: RoadmapTask["status"]): RoadmapTask {
	const ts = "2026-01-01T00:00:00.000Z";
	return {
		$id: status + Math.random(),
		sectionId: "s",
		parentTaskId: null,
		taskCode: "0.1",
		title: "t",
		description: "",
		acceptanceCriteria: [],
		orderIndex: 0,
		status,
		branchName: null,
		prUrl: null,
		prNumber: null,
		testSuiteRef: "x",
		latestTestRunId: null,
		completedAt: null,
		completedCommitSha: null,
		$createdAt: ts,
		$updatedAt: ts,
	};
}

describe("RoadmapProgressBar math", () => {
	it("is exact complete/total for edge cases the UI relies on", () => {
		expect(computeProgressPercent([])).toBe(0);
		expect(computeProgressPercent([task("locked"), task("complete")])).toBe(50);
		expect(
			computeProgressPercent([task("complete"), task("complete"), task("complete")]),
		).toBe(100);
	});
});
