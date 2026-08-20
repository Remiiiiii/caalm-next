/**
 * Roadmap business logic — the only path to `complete` is completeTaskFromMerge().
 */

import {
	appendStatusLog,
	createTestRun,
	findTestRunForCommit,
	getSectionById,
	getTaskByCode,
	getTaskById,
	getTaskByPrNumber,
	getTestRunById,
	listSections,
	listStatusLogs,
	listTasks,
	persistUnlockedSnapshot,
	saveTask,
} from "./store";
import {
	buildTaskTree,
	computeProgressPercent,
	countByStatus,
} from "./locking";
import type {
	RoadmapOverview,
	RoadmapSectionOverview,
	RoadmapTask,
	RoadmapTaskTreeNode,
	RoadmapTestRun,
} from "./types";

export class RoadmapError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "RoadmapError";
		this.status = status;
	}
}

export async function getOverview(): Promise<RoadmapOverview> {
	await persistUnlockedSnapshot();
	const sections = await listSections();
	const tasks = await listTasks();

	const sectionViews: RoadmapSectionOverview[] = sections.map((section) => {
		const sectionTasks = tasks.filter((t) => t.sectionId === section.$id);
		const taskCounts = countByStatus(sectionTasks);
		return {
			id: section.$id,
			sectionNumber: section.sectionNumber,
			title: section.title,
			status: section.status,
			progressPercent: computeProgressPercent(sectionTasks),
			taskCounts,
		};
	});

	return {
		overallProgressPercent: computeProgressPercent(tasks),
		sections: sectionViews,
	};
}

export async function getSectionTaskTree(
	sectionId: string,
): Promise<{ sectionId: string; tasks: RoadmapTaskTreeNode[] }> {
	await persistUnlockedSnapshot();
	const section = await getSectionById(sectionId);
	if (!section) throw new RoadmapError("Section not found", 404);

	const sections = await listSections();
	const tasks = await listTasks();
	return {
		sectionId,
		tasks: buildTaskTree(tasks, sectionId, { sections, tasks }),
	};
}

export async function getTaskDetail(taskId: string) {
	await persistUnlockedSnapshot();
	const task = await getTaskById(taskId);
	if (!task) throw new RoadmapError("Task not found", 404);

	const history = await listStatusLogs(taskId);
	const latestTestRun = task.latestTestRunId
		? await getTestRunById(task.latestTestRunId)
		: null;

	return { task, history, latestTestRun };
}

export async function startTask(params: {
	taskId: string;
	branchName: string;
	actorUserId: string;
}): Promise<RoadmapTask> {
	await persistUnlockedSnapshot();
	const task = await getTaskById(params.taskId);
	if (!task) throw new RoadmapError("Task not found", 404);

	if (task.status === "locked") {
		throw new RoadmapError("Task is locked until prerequisites complete", 409);
	}
	if (task.status !== "available") {
		throw new RoadmapError(
			`Task cannot be started from status=${task.status}`,
			409,
		);
	}
	if (!params.branchName?.trim()) {
		throw new RoadmapError("branchName is required", 400);
	}

	const fromStatus = task.status;
	const next: RoadmapTask = {
		...task,
		status: "in_progress",
		branchName: params.branchName.trim(),
	};
	await saveTask(next);
	await appendStatusLog({
		entityType: "task",
		entityId: task.$id,
		fromStatus,
		toStatus: "in_progress",
		actor: params.actorUserId,
		commitSha: null,
		testRunId: null,
	});
	return next;
}

export async function linkPullRequest(params: {
	taskId: string;
	prUrl: string;
	prNumber: number;
	actor?: string;
}): Promise<RoadmapTask> {
	const task = await getTaskById(params.taskId);
	if (!task) throw new RoadmapError("Task not found", 404);

	if (task.status !== "in_progress" && task.status !== "in_review") {
		throw new RoadmapError(
			`PR can only be linked when task is in_progress (got ${task.status})`,
			409,
		);
	}

	const fromStatus = task.status;
	const next: RoadmapTask = {
		...task,
		status: "in_review",
		prUrl: params.prUrl,
		prNumber: params.prNumber,
	};
	await saveTask(next);
	if (fromStatus !== "in_review") {
		await appendStatusLog({
			entityType: "task",
			entityId: task.$id,
			fromStatus,
			toStatus: "in_review",
			actor: params.actor || "system:pr-link",
			commitSha: null,
			testRunId: null,
		});
	}
	return next;
}

export type CiTestResultInput = {
	prNumber: number;
	commitSha: string;
	taskCode: string;
	result: "passed" | "failed" | "error";
	logsUrl: string;
	summary: string;
};

export type CiTestResultOutcome = {
	task: RoadmapTask;
	testRun: RoadmapTestRun;
	clearedToMerge: boolean;
	commentBody: string;
};

export async function recordCiTestResult(
	input: CiTestResultInput,
): Promise<CiTestResultOutcome> {
	const task =
		(await getTaskByCode(input.taskCode)) ||
		(await getTaskByPrNumber(input.prNumber));
	if (!task) {
		throw new RoadmapError(
			`Unknown taskCode/prNumber: ${input.taskCode}/${input.prNumber}`,
			404,
		);
	}
	if (task.status === "locked") {
		throw new RoadmapError(
			"CI result rejected: task is locked (unexpected transition)",
			409,
		);
	}

	const testRun = await createTestRun({
		taskId: task.$id,
		prNumber: input.prNumber,
		commitSha: input.commitSha,
		triggeredBy: "pr_update",
		result: input.result,
		logsUrl: input.logsUrl,
		summary: input.summary,
	});

	const next: RoadmapTask = {
		...task,
		status: task.status === "complete" ? task.status : "in_review",
		prNumber: input.prNumber,
		latestTestRunId: testRun.$id,
	};
	await saveTask(next);

	const clearedToMerge = input.result === "passed";
	const commentBody = clearedToMerge
		? `Tests passed — this PR is cleared to merge.\n\nTask \`${task.taskCode}\` · commit \`${input.commitSha}\`\n${input.summary}\n${input.logsUrl}`
		: `Tests ${input.result} — merge is not cleared.\n\nTask \`${task.taskCode}\` · commit \`${input.commitSha}\`\n${input.summary}\n${input.logsUrl}`;

	await appendStatusLog({
		entityType: "task",
		entityId: task.$id,
		fromStatus: task.status,
		toStatus: next.status,
		actor: "system:ci-webhook",
		commitSha: input.commitSha,
		testRunId: testRun.$id,
	});

	return { task: next, testRun, clearedToMerge, commentBody };
}

export type MergeCompleteInput = {
	prNumber: number;
	mergeCommitSha: string;
	baseBranch: string;
	taskCode: string;
};

export type MergeCompleteOutcome = {
	task: RoadmapTask;
	completed: boolean;
	reason?: string;
	testRun?: RoadmapTestRun;
};

/**
 * Sole path that may set status=complete.
 */
export async function completeTaskFromMerge(
	input: MergeCompleteInput,
): Promise<MergeCompleteOutcome> {
	const allowedBases = new Set(["main", "master"]);
	if (!allowedBases.has(input.baseBranch)) {
		throw new RoadmapError(
			`Merge base must be main/master (got ${input.baseBranch})`,
			400,
		);
	}

	const task =
		(await getTaskByCode(input.taskCode)) ||
		(await getTaskByPrNumber(input.prNumber));
	if (!task) {
		throw new RoadmapError("Task not found for merge event", 404);
	}
	if (task.status !== "in_review") {
		throw new RoadmapError(
			`Merge rejected: expected in_review, got ${task.status}`,
			409,
		);
	}

	let testRun = await findTestRunForCommit({
		taskId: task.$id,
		commitSha: input.mergeCommitSha,
		result: "passed",
	});

	// Pre-merge recheck stub when no exact-sha pass exists yet
	if (!testRun) {
		testRun = await createTestRun({
			taskId: task.$id,
			prNumber: input.prNumber,
			commitSha: input.mergeCommitSha,
			triggeredBy: "pre_merge_recheck",
			result: "pending",
			logsUrl: "",
			summary: "Awaiting recheck on merge commit",
			finishedAt: null,
		});

		// In memory/test mode, require an explicit passed run for the merge sha.
		// Production CI should post a recheck result before/alongside merge handling.
		return {
			task,
			completed: false,
			reason:
				"No passing test run found for merge commit; task stays in_review",
			testRun,
		};
	}

	if (testRun.result !== "passed") {
		return {
			task,
			completed: false,
			reason: `Recheck ${testRun.result} on ${input.mergeCommitSha}; task stays in_review`,
			testRun,
		};
	}

	const fromStatus = task.status;
	const completedAt = new Date().toISOString();
	const next: RoadmapTask = {
		...task,
		status: "complete",
		completedAt,
		completedCommitSha: input.mergeCommitSha,
		latestTestRunId: testRun.$id,
	};
	await saveTask(next);
	await appendStatusLog({
		entityType: "task",
		entityId: task.$id,
		fromStatus,
		toStatus: "complete",
		actor: "system:merge-webhook",
		commitSha: input.mergeCommitSha,
		testRunId: testRun.$id,
	});

	await persistUnlockedSnapshot();
	const refreshed = (await getTaskById(task.$id)) || next;
	return { task: refreshed, completed: true, testRun };
}

/**
 * Explicitly forbidden — any user-facing attempt to force-complete.
 */
export async function rejectForcedComplete(): Promise<never> {
	await appendStatusLog({
		entityType: "task",
		entityId: "forbidden",
		fromStatus: "n/a",
		toStatus: "complete",
		actor: "security:forbidden-complete",
		commitSha: null,
		testRunId: null,
	});
	throw new RoadmapError(
		"Setting status=complete is forbidden outside the verified merge webhook",
		403,
	);
}

/**
 * Mark a pre-merge recheck as passed (used by CI webhook with triggeredBy semantics,
 * or by tests simulating a green main HEAD).
 */
export async function recordPassingRecheck(params: {
	taskId: string;
	prNumber: number;
	commitSha: string;
	logsUrl?: string;
	summary?: string;
}): Promise<RoadmapTestRun> {
	return createTestRun({
		taskId: params.taskId,
		prNumber: params.prNumber,
		commitSha: params.commitSha,
		triggeredBy: "pre_merge_recheck",
		result: "passed",
		logsUrl: params.logsUrl || "",
		summary: params.summary || "Pre-merge recheck passed",
	});
}
