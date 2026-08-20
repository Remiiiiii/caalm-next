import { describe, expect, it } from "vitest";
import {
	buildTaskTree,
	computeProgressPercent,
	computeUnlocked,
	lockReasonForTask,
} from "./locking";
import type { RoadmapSection, RoadmapTask } from "./types";

function section(
	partial: Partial<RoadmapSection> &
		Pick<RoadmapSection, "$id" | "sectionNumber" | "title">,
): RoadmapSection {
	const ts = "2026-01-01T00:00:00.000Z";
	return {
		sourceRef: "test",
		status: "locked",
		orderIndex: partial.sectionNumber,
		$createdAt: ts,
		$updatedAt: ts,
		...partial,
	};
}

function task(
	partial: Partial<RoadmapTask> &
		Pick<RoadmapTask, "$id" | "sectionId" | "taskCode" | "orderIndex">,
): RoadmapTask {
	const ts = "2026-01-01T00:00:00.000Z";
	return {
		parentTaskId: null,
		title: partial.taskCode,
		description: "",
		acceptanceCriteria: [],
		status: "locked",
		branchName: null,
		prUrl: null,
		prNumber: null,
		testSuiteRef: "tests/x",
		latestTestRunId: null,
		completedAt: null,
		completedCommitSha: null,
		$createdAt: ts,
		$updatedAt: ts,
		...partial,
	};
}

describe("computeUnlocked", () => {
	it("keeps section 2 locked while section 1 is incomplete", () => {
		const sections = [
			section({ $id: "s0", sectionNumber: 0, title: "Engine", status: "complete" }),
			section({ $id: "s1", sectionNumber: 1, title: "Trust", status: "available" }),
			section({ $id: "s2", sectionNumber: 2, title: "Audit", status: "locked" }),
		];
		const tasks = [
			task({
				$id: "t1.1",
				sectionId: "s1",
				taskCode: "1.1",
				orderIndex: 0,
				status: "available",
			}),
			task({
				$id: "t1.2",
				sectionId: "s1",
				taskCode: "1.2",
				orderIndex: 1,
				status: "locked",
			}),
			task({
				$id: "t2.1",
				sectionId: "s2",
				taskCode: "2.1",
				orderIndex: 0,
				status: "locked",
			}),
		];

		const { snapshot } = computeUnlocked({ sections, tasks });
		expect(snapshot.sections.find((s) => s.$id === "s2")?.status).toBe(
			"locked",
		);
		expect(snapshot.tasks.find((t) => t.$id === "t2.1")?.status).toBe("locked");
		expect(lockReasonForTask(tasks[2]!, { sections, tasks })).toMatch(
			/section 1/i,
		);
	});

	it("unlocks the next sibling when the prior sibling completes", () => {
		const sections = [
			section({
				$id: "s1",
				sectionNumber: 1,
				title: "Trust",
				status: "in_progress",
			}),
		];
		const tasks = [
			task({
				$id: "t1.1",
				sectionId: "s1",
				taskCode: "1.1",
				orderIndex: 0,
				status: "complete",
			}),
			task({
				$id: "t1.2",
				sectionId: "s1",
				taskCode: "1.2",
				orderIndex: 1,
				status: "locked",
			}),
		];

		const { snapshot, transitions } = computeUnlocked({ sections, tasks });
		expect(snapshot.tasks.find((t) => t.$id === "t1.2")?.status).toBe(
			"available",
		);
		expect(
			transitions.some(
				(tr) => tr.entityId === "t1.2" && tr.toStatus === "available",
			),
		).toBe(true);
	});

	it("keeps a child locked until its parent is complete", () => {
		const sections = [
			section({
				$id: "s1",
				sectionNumber: 1,
				title: "Trust",
				status: "available",
			}),
		];
		const tasks = [
			task({
				$id: "parent",
				sectionId: "s1",
				taskCode: "1.3",
				orderIndex: 0,
				status: "available",
			}),
			task({
				$id: "child",
				sectionId: "s1",
				parentTaskId: "parent",
				taskCode: "1.3.a",
				orderIndex: 0,
				status: "locked",
			}),
		];

		const { snapshot } = computeUnlocked({ sections, tasks });
		expect(snapshot.tasks.find((t) => t.$id === "child")?.status).toBe(
			"locked",
		);

		const afterParent = computeUnlocked({
			sections: snapshot.sections,
			tasks: snapshot.tasks.map((t) =>
				t.$id === "parent" ? { ...t, status: "complete" } : t,
			),
		});
		expect(afterParent.snapshot.tasks.find((t) => t.$id === "child")?.status).toBe(
			"available",
		);
	});

	it("marks a section complete when all tasks are complete and unlocks the next section", () => {
		const sections = [
			section({
				$id: "s1",
				sectionNumber: 1,
				title: "Trust",
				status: "in_progress",
			}),
			section({
				$id: "s2",
				sectionNumber: 2,
				title: "Audit",
				status: "locked",
			}),
		];
		const tasks = [
			task({
				$id: "t1.1",
				sectionId: "s1",
				taskCode: "1.1",
				orderIndex: 0,
				status: "complete",
			}),
			task({
				$id: "t2.1",
				sectionId: "s2",
				taskCode: "2.1",
				orderIndex: 0,
				status: "locked",
			}),
		];

		const { snapshot } = computeUnlocked({ sections, tasks });
		expect(snapshot.sections.find((s) => s.$id === "s1")?.status).toBe(
			"complete",
		);
		expect(snapshot.sections.find((s) => s.$id === "s2")?.status).toBe(
			"available",
		);
		expect(snapshot.tasks.find((t) => t.$id === "t2.1")?.status).toBe(
			"available",
		);
	});
});

describe("computeProgressPercent", () => {
	it("matches complete/total exactly for 0, partial, and 100%", () => {
		expect(computeProgressPercent([])).toBe(0);
		expect(
			computeProgressPercent([
				task({ $id: "a", sectionId: "s", taskCode: "1", orderIndex: 0 }),
				task({
					$id: "b",
					sectionId: "s",
					taskCode: "2",
					orderIndex: 1,
					status: "complete",
				}),
			]),
		).toBe(50);
		expect(
			computeProgressPercent([
				task({
					$id: "a",
					sectionId: "s",
					taskCode: "1",
					orderIndex: 0,
					status: "complete",
				}),
			]),
		).toBe(100);
	});
});

describe("buildTaskTree", () => {
	it("nests children under parents", () => {
		const sections = [
			section({ $id: "s1", sectionNumber: 1, title: "Trust" }),
		];
		const tasks = [
			task({
				$id: "p",
				sectionId: "s1",
				taskCode: "1.1",
				orderIndex: 0,
				status: "available",
			}),
			task({
				$id: "c",
				sectionId: "s1",
				parentTaskId: "p",
				taskCode: "1.1.a",
				orderIndex: 0,
				status: "locked",
			}),
		];
		const tree = buildTaskTree(tasks, "s1", { sections, tasks });
		expect(tree).toHaveLength(1);
		expect(tree[0]?.children[0]?.taskCode).toBe("1.1.a");
	});
});
