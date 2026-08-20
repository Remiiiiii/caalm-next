import { describe, expect, it, beforeEach } from "vitest";
import {
	completeTaskFromMerge,
	getOverview,
	linkPullRequest,
	recordCiTestResult,
	recordPassingRecheck,
	rejectForcedComplete,
	startTask,
} from "./service";
import { resetRoadmapMemoryForTests } from "./store";

describe("roadmap service", () => {
	beforeEach(() => {
		resetRoadmapMemoryForTests();
	});

	it("seeds section 0 with first task available and overall progress at 0", async () => {
		const overview = await getOverview();
		expect(overview.overallProgressPercent).toBe(0);
		const s0 = overview.sections.find((s) => s.sectionNumber === 0);
		// Spec: section is in_progress once ≥1 task is not locked
		expect(s0?.status).toBe("in_progress");
		expect(s0?.taskCounts.available).toBeGreaterThanOrEqual(1);
		const s1 = overview.sections.find((s) => s.sectionNumber === 1);
		expect(s1?.status).toBe("locked");
	});

	it("rejects forced complete with 403", async () => {
		await expect(rejectForcedComplete()).rejects.toMatchObject({
			status: 403,
		});
	});

	it("starts available task, links PR, fails CI → stays in_review", async () => {
		const overview = await getOverview();
		const s0 = overview.sections.find((s) => s.sectionNumber === 0)!;
		const { getSectionTaskTree } = await import("./service");
		const tree = await getSectionTaskTree(s0.id);
		const first = tree.tasks[0]!;
		expect(first.status).toBe("available");

		const started = await startTask({
			taskId: first.$id,
			branchName: "clm/0-0.1-data-model",
			actorUserId: "user_dev",
		});
		expect(started.status).toBe("in_progress");
		expect(started.branchName).toBe("clm/0-0.1-data-model");

		const linked = await linkPullRequest({
			taskId: first.$id,
			prUrl: "https://github.com/org/caalm/pull/1",
			prNumber: 1,
		});
		expect(linked.status).toBe("in_review");

		const failed = await recordCiTestResult({
			prNumber: 1,
			commitSha: "abc111",
			taskCode: first.taskCode,
			result: "failed",
			logsUrl: "https://ci.example/1",
			summary: "2 failed",
		});
		expect(failed.clearedToMerge).toBe(false);
		expect(failed.task.status).toBe("in_review");
	});

	it("completes only after passing run on merge commit, then unlocks next task", async () => {
		const { getSectionTaskTree } = await import("./service");
		const overview = await getOverview();
		const s0 = overview.sections.find((s) => s.sectionNumber === 0)!;
		const tree = await getSectionTaskTree(s0.id);
		const first = tree.tasks[0]!;
		const second = tree.tasks[1]!;
		expect(second.status).toBe("locked");

		await startTask({
			taskId: first.$id,
			branchName: "clm/0-0.1-data-model",
			actorUserId: "user_dev",
		});
		await linkPullRequest({
			taskId: first.$id,
			prUrl: "https://github.com/org/caalm/pull/2",
			prNumber: 2,
		});

		const mergeSha = "deadbeef01";
		await recordCiTestResult({
			prNumber: 2,
			commitSha: mergeSha,
			taskCode: first.taskCode,
			result: "passed",
			logsUrl: "https://ci.example/2",
			summary: "all green",
		});

		// Ensure exact merge-sha pass exists (simulates recheck)
		await recordPassingRecheck({
			taskId: first.$id,
			prNumber: 2,
			commitSha: mergeSha,
		});

		const merged = await completeTaskFromMerge({
			prNumber: 2,
			mergeCommitSha: mergeSha,
			baseBranch: "main",
			taskCode: first.taskCode,
		});
		expect(merged.completed).toBe(true);
		expect(merged.task.status).toBe("complete");
		expect(merged.task.completedCommitSha).toBe(mergeSha);

		const after = await getSectionTaskTree(s0.id);
		expect(after.tasks[1]?.status).toBe("available");
	});

	it("refuses merge completion when no passing run exists for merge sha", async () => {
		const { getSectionTaskTree } = await import("./service");
		const overview = await getOverview();
		const s0 = overview.sections.find((s) => s.sectionNumber === 0)!;
		const first = (await getSectionTaskTree(s0.id)).tasks[0]!;

		await startTask({
			taskId: first.$id,
			branchName: "clm/0-0.1-data-model",
			actorUserId: "user_dev",
		});
		await linkPullRequest({
			taskId: first.$id,
			prUrl: "https://github.com/org/caalm/pull/3",
			prNumber: 3,
		});
		await recordCiTestResult({
			prNumber: 3,
			commitSha: "oldsha",
			taskCode: first.taskCode,
			result: "passed",
			logsUrl: "https://ci.example/3",
			summary: "stale pass",
		});

		const merged = await completeTaskFromMerge({
			prNumber: 3,
			mergeCommitSha: "newmerge",
			baseBranch: "main",
			taskCode: first.taskCode,
		});
		expect(merged.completed).toBe(false);
		expect(merged.task.status).toBe("in_review");
	});
});
