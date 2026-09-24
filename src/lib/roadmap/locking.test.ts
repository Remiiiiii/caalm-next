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
	it("completes nested checklist tasks when the NPO batch parent is already complete", () => {
		const sections = [
			section({
				$id: "s2",
				sectionNumber: 2,
				title: "Gifts",
				status: "in_progress",
			}),
		];
		const tasks = [
			task({
				$id: "t28",
				sectionId: "s2",
				taskCode: "2.8",
				orderIndex: 0,
				status: "complete",
				completedAt: "2026-01-02T00:00:00.000Z",
				completedCommitSha: "abc123",
			}),
			task({
				$id: "t28a",
				sectionId: "s2",
				parentTaskId: "t28",
				taskCode: "2.8.a",
				orderIndex: 0,
				status: "locked",
			}),
			task({
				$id: "t28b",
				sectionId: "s2",
				parentTaskId: "t28",
				taskCode: "2.8.b",
				orderIndex: 1,
				status: "locked",
			}),
		];
		const { snapshot } = computeUnlocked({
			sections,
			tasks,
			sequentialTasks: true,
		});
		const childA = snapshot.tasks.find((t) => t.taskCode === "2.8.a");
		const childB = snapshot.tasks.find((t) => t.taskCode === "2.8.b");
		expect(childA?.status).toBe("complete");
		expect(childB?.status).toBe("complete");
		expect(childA?.completedCommitSha).toBe("abc123");
	});

	it("keeps section 2 locked while section 1 is incomplete", () => {
		const sections = [
			section({
				$id: "s0",
				sectionNumber: 0,
				title: "Engine",
				status: "complete",
			}),
			section({
				$id: "s1",
				sectionNumber: 1,
				title: "Trust",
				status: "available",
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

	it("keeps remaining tasks locked until the whole section completes via merge", () => {
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

		const { snapshot } = computeUnlocked({ sections, tasks });
		expect(snapshot.tasks.find((t) => t.$id === "t1.2")?.status).toBe("locked");
		expect(
			lockReasonForTask(snapshot.tasks.find((t) => t.$id === "t1.2")!, {
				sections: snapshot.sections,
				tasks: snapshot.tasks,
				mergeBlockReasons: {
					s1: "Waiting for PR #54 to merge",
				},
			}),
		).toMatch(/PR #54/);
	});

	it("re-locks leftover available tasks while the section waits on PRs", () => {
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
		expect(snapshot.tasks.find((t) => t.$id === "parent")?.status).toBe(
			"locked",
		);
		expect(snapshot.tasks.find((t) => t.$id === "child")?.status).toBe(
			"locked",
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
		expect(snapshot.tasks.find((t) => t.$id === "t2.1")?.status).toBe("locked");
	});

	it("sequential mode unlocks only the next incomplete task", () => {
		const sections = [
			section({
				$id: "s0",
				sectionNumber: 0,
				title: "Engine",
				status: "available",
			}),
			section({
				$id: "s1",
				sectionNumber: 1,
				title: "CRM",
				status: "locked",
			}),
		];
		const tasks = [
			task({
				$id: "t0.1",
				sectionId: "s0",
				taskCode: "0.1",
				title: "Dual catalog",
				orderIndex: 0,
				status: "locked",
			}),
			task({
				$id: "t0.2",
				sectionId: "s0",
				taskCode: "0.2",
				title: "Sequential lock",
				orderIndex: 1,
				status: "locked",
			}),
			task({
				$id: "t1.1",
				sectionId: "s1",
				taskCode: "1.1",
				orderIndex: 0,
				status: "locked",
			}),
		];

		const { snapshot } = computeUnlocked({
			sections,
			tasks,
			sequentialTasks: true,
		});
		expect(snapshot.tasks.find((t) => t.$id === "t0.1")?.status).toBe(
			"available",
		);
		expect(snapshot.tasks.find((t) => t.$id === "t0.2")?.status).toBe("locked");
		expect(snapshot.tasks.find((t) => t.$id === "t1.1")?.status).toBe("locked");
		expect(snapshot.sections.find((s) => s.$id === "s0")?.status).toBe(
			"in_progress",
		);
		expect(snapshot.sections.find((s) => s.$id === "s1")?.status).toBe(
			"locked",
		);
		expect(
			lockReasonForTask(snapshot.tasks.find((t) => t.$id === "t0.2")!, {
				...snapshot,
				sequentialTasks: true,
			}),
		).toMatch(/0\.1/);
		expect(
			lockReasonForTask(snapshot.tasks.find((t) => t.$id === "t1.1")!, {
				...snapshot,
				sequentialTasks: true,
			}),
		).toMatch(/section 0/i);
	});

	it("sequential mode opens the next task after the current one completes", () => {
		const sections = [
			section({
				$id: "s1",
				sectionNumber: 1,
				title: "CRM",
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
			task({
				$id: "parent",
				sectionId: "s1",
				taskCode: "1.3",
				orderIndex: 2,
				status: "locked",
			}),
			task({
				$id: "child-a",
				sectionId: "s1",
				parentTaskId: "parent",
				taskCode: "1.3.a",
				orderIndex: 0,
				status: "locked",
			}),
			task({
				$id: "child-b",
				sectionId: "s1",
				parentTaskId: "parent",
				taskCode: "1.3.b",
				orderIndex: 1,
				status: "locked",
			}),
		];

		const { snapshot } = computeUnlocked({
			sections,
			tasks,
			sequentialTasks: true,
		});
		expect(snapshot.tasks.find((t) => t.$id === "t1.2")?.status).toBe(
			"available",
		);
		expect(snapshot.tasks.find((t) => t.$id === "parent")?.status).toBe(
			"locked",
		);
		expect(snapshot.tasks.find((t) => t.$id === "child-a")?.status).toBe(
			"locked",
		);
	});

	it("sequential mode unlocks the first child and completes the parent when children finish", () => {
		const sections = [
			section({
				$id: "s1",
				sectionNumber: 1,
				title: "CRM",
				status: "in_progress",
			}),
			section({
				$id: "s2",
				sectionNumber: 2,
				title: "Gifts",
				status: "locked",
			}),
		];
		const tasks = [
			task({
				$id: "parent",
				sectionId: "s1",
				taskCode: "1.3",
				orderIndex: 0,
				status: "in_progress",
			}),
			task({
				$id: "child-a",
				sectionId: "s1",
				parentTaskId: "parent",
				taskCode: "1.3.a",
				orderIndex: 0,
				status: "complete",
			}),
			task({
				$id: "child-b",
				sectionId: "s1",
				parentTaskId: "parent",
				taskCode: "1.3.b",
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

		const mid = computeUnlocked({
			sections,
			tasks,
			sequentialTasks: true,
		}).snapshot;
		expect(mid.tasks.find((t) => t.$id === "child-b")?.status).toBe(
			"available",
		);
		expect(mid.tasks.find((t) => t.$id === "parent")?.status).toBe(
			"in_progress",
		);
		expect(mid.sections.find((s) => s.$id === "s2")?.status).toBe("locked");

		const childB = mid.tasks.find((t) => t.$id === "child-b")!;
		childB.status = "complete";
		const done = computeUnlocked({
			sections: mid.sections,
			tasks: mid.tasks,
			sequentialTasks: true,
		}).snapshot;
		expect(done.tasks.find((t) => t.$id === "parent")?.status).toBe("complete");
		expect(done.sections.find((s) => s.$id === "s1")?.status).toBe("complete");
		expect(done.sections.find((s) => s.$id === "s2")?.status).toBe(
			"in_progress",
		);
		expect(done.tasks.find((t) => t.$id === "t2.1")?.status).toBe("available");
	});

	it("does not lock a later section whose tasks are already all complete", () => {
		const sections = [
			section({
				$id: "s5",
				sectionNumber: 5,
				title: "Clauses",
				status: "in_progress",
			}),
			section({
				$id: "s11",
				sectionNumber: 11,
				title: "Growth API",
				status: "locked",
			}),
		];
		const tasks = [
			task({
				$id: "t5.1",
				sectionId: "s5",
				taskCode: "5.1",
				orderIndex: 0,
				status: "in_review",
			}),
			task({
				$id: "t11.1",
				sectionId: "s11",
				taskCode: "11.1",
				orderIndex: 0,
				status: "complete",
			}),
			task({
				$id: "t11.2",
				sectionId: "s11",
				taskCode: "11.2",
				orderIndex: 1,
				status: "complete",
			}),
		];

		const { snapshot } = computeUnlocked({ sections, tasks });
		expect(snapshot.sections.find((s) => s.$id === "s5")?.status).toBe(
			"in_progress",
		);
		expect(snapshot.sections.find((s) => s.$id === "s11")?.status).toBe(
			"complete",
		);
		expect(snapshot.tasks.find((t) => t.$id === "t11.1")?.status).toBe(
			"complete",
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
		const sections = [section({ $id: "s1", sectionNumber: 1, title: "Trust" })];
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
