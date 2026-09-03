/**
 * Roadmap business logic — tasks complete via completeSectionFromMerge()
 * or when a catalog-linked GitHub PR is already merged (overview reconcile).
 */

import {
	appendStatusLog,
	createTestRun,
	findTestRunForPrCommit,
	getSectionById,
	getTaskByCode,
	getTaskById,
	getTaskByPrNumber,
	getTasksByPrNumber,
	getTestRunById,
	listSections,
	listStatusLogs,
	listTasks,
	persistUnlockedSnapshot,
	saveSection,
	saveTask,
} from "./store";
import {
	getCatalogLinkedPrNumber,
	getCatalogLinkedPrNumbers,
	getSectionNumberForPr,
	ROADMAP_TRACKING_STUB_PRS,
	sectionCompletesOnMergedCatalogPr,
	sectionUsesPerTaskPrCompletion,
} from "./catalog";
import { fetchPullRequestStatus, listOpenPullRequests } from "./github";
import {
	findSectionPullRequest,
	matchPullRequestToTask,
	resolveSectionFromPrMatch,
	type GitHubPullRequestSummary,
	type ResolvedPullRequest,
} from "./github-pr-match";
import {
	buildTaskTree,
	computeProgressPercent,
	computeUnlocked,
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

/** Prefer an active in-flight PR; otherwise the first linked PR in the section. */
function pickSectionPrTask(tasks: RoadmapTask[]): RoadmapTask | null {
	const withPr = tasks.filter((t) => t.prNumber != null);
	if (!withPr.length) return null;
	const active = withPr.find(
		(t) => t.status === "in_review" || t.status === "in_progress",
	);
	return active ?? withPr[0];
}

function toResolvedFromSummary(
	pr: GitHubPullRequestSummary,
	source: ResolvedPullRequest["source"],
): ResolvedPullRequest {
	return { ...pr, source };
}

async function resolveFromPrNumber(
	prNumber: number,
	source: ResolvedPullRequest["source"],
): Promise<ResolvedPullRequest | null> {
	const live = await fetchPullRequestStatus({ prNumber });
	if (!live.title && !live.htmlUrl) return null;
	return {
		number: live.number ?? prNumber,
		title: live.title ?? `PR #${prNumber}`,
		htmlUrl: live.htmlUrl ?? "",
		headRef: live.headRef ?? "",
		state:
			live.state === "unknown"
				? "open"
				: (live.state as ResolvedPullRequest["state"]),
		source,
	};
}

async function resolveSectionPullRequest(
	sectionNumber: number,
	sectionTasks: RoadmapTask[],
	openPrs: GitHubPullRequestSummary[],
): Promise<ResolvedPullRequest | null> {
	const prTask = pickSectionPrTask(sectionTasks);
	if (prTask?.prNumber) {
		const linked = await resolveFromPrNumber(prTask.prNumber, "linked");
		if (linked) {
			return {
				...linked,
				htmlUrl: linked.htmlUrl || prTask.prUrl || "",
				headRef: linked.headRef || prTask.branchName || "",
			};
		}
	}

	const catalogPr = getCatalogLinkedPrNumber(sectionNumber);
	if (catalogPr) {
		const fromCatalog = await resolveFromPrNumber(catalogPr, "catalog");
		if (fromCatalog) return fromCatalog;
	}

	const discovered = findSectionPullRequest(openPrs, sectionNumber);
	return discovered
		? toResolvedFromSummary(discovered, "discovered_section")
		: null;
}

export async function resolveTaskPullRequest(
	task: RoadmapTask,
	sectionNumber: number,
	openPrs?: GitHubPullRequestSummary[],
): Promise<ResolvedPullRequest | null> {
	if (task.prNumber) {
		const linked = await resolveFromPrNumber(task.prNumber, "linked");
		if (linked) {
			return {
				...linked,
				htmlUrl: linked.htmlUrl || task.prUrl || "",
				headRef: linked.headRef || task.branchName || "",
			};
		}
	}

	const prs = openPrs ?? (await listOpenPullRequests());
	const taskSpecific = prs.find((pr) =>
		matchPullRequestToTask(pr, sectionNumber, task.taskCode),
	);
	return taskSpecific
		? toResolvedFromSummary(taskSpecific, "discovered_task")
		: null;
}

function enrichTreeWithPrBranches(
	nodes: RoadmapTaskTreeNode[],
	branchByPr: Map<number, string>,
): RoadmapTaskTreeNode[] {
	const walk = (node: RoadmapTaskTreeNode): RoadmapTaskTreeNode => {
		const prBranch =
			node.branchName?.trim() ||
			(node.prNumber != null ? branchByPr.get(node.prNumber) : undefined) ||
			null;
		return {
			...node,
			prBranch,
			children: node.children.map(walk),
		};
	};
	return nodes.map(walk);
}

async function firstTaskInSection(
	sectionNumber: number,
): Promise<RoadmapTask | null> {
	const sections = await listSections();
	const section = sections.find((s) => s.sectionNumber === sectionNumber);
	if (!section) return null;
	const tasks = await listTasks();
	return (
		tasks
			.filter((t) => t.sectionId === section.$id && !t.parentTaskId)
			.sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? null
	);
}

export async function evaluateSectionMergeBlock(
	sectionNumber: number,
	options?: { triggeringPr?: { prNumber: number; mergeCommitSha: string } },
): Promise<string | null> {
	const numbers = getCatalogLinkedPrNumbers(sectionNumber);
	if (!numbers.length) return "No catalog PRs linked to this section";

	const openNumbers = new Set(
		(await listOpenPullRequests().catch(() => [])).map((pr) => pr.number),
	);

	for (const number of numbers) {
		const isTrigger = options?.triggeringPr?.prNumber === number;
		if (isTrigger) {
			const sha = options.triggeringPr.mergeCommitSha;
			const run = await findTestRunForPrCommit({
				prNumber: number,
				commitSha: sha,
				result: "passed",
			});
			if (!run) {
				return `PR #${number}: no passing test run on ${sha}`;
			}
			continue;
		}

		if (openNumbers.has(number)) {
			return `Waiting for PR #${number} to merge`;
		}

		const live = await fetchPullRequestStatus({ prNumber: number });
		if (live.state === "closed") {
			return `PR #${number} was closed without merging`;
		}
		if (live.state !== "merged") {
			return `Waiting for PR #${number} to merge`;
		}
		const sha = live.mergeCommitSha;
		if (!sha) {
			return `PR #${number}: missing merge commit`;
		}
		const run = await findTestRunForPrCommit({
			prNumber: number,
			commitSha: sha,
			result: "passed",
		});
		if (!run) {
			return `PR #${number}: no passing test run on ${sha}`;
		}
	}
	return null;
}

type CatalogPrLinkMeta = {
	title: string;
	state?: "open" | "closed" | "merged" | "unknown";
	mergeCommitSha?: string;
};

/** Titles/state for catalog PRs — open list first, then GitHub lookup for merged/closed. */
async function resolveCatalogPrLookup(
	openPrs: GitHubPullRequestSummary[],
	catalogNumbers: number[],
): Promise<Map<number, CatalogPrLinkMeta>> {
	const lookup = new Map<number, CatalogPrLinkMeta>();
	for (const pr of openPrs) {
		lookup.set(pr.number, { title: pr.title, state: pr.state });
	}
	const missing = [...new Set(catalogNumbers)].filter((n) => !lookup.has(n));
	await Promise.all(
		missing.map(async (number) => {
			const live = await fetchPullRequestStatus({ prNumber: number });
			if (live.state === "unknown" && !live.title) return;
			lookup.set(number, {
				title: live.title ?? "",
				state: live.state,
				mergeCommitSha: live.mergeCommitSha,
			});
		}),
	);
	return lookup;
}

function toPrSummary(
	prNumber: number,
	live: Awaited<ReturnType<typeof fetchPullRequestStatus>>,
): GitHubPullRequestSummary {
	const state =
		live.state === "merged" || live.state === "closed" || live.state === "open"
			? live.state
			: "open";
	return {
		number: live.number ?? prNumber,
		title: live.title ?? "",
		htmlUrl: live.htmlUrl ?? "",
		headRef: live.headRef ?? "",
		state,
	};
}

/** Mark catalog-linked tasks complete when GitHub already shows their PR merged. */
async function persistTasksCompletedByMergedPrs(
	tasks: RoadmapTask[],
	prLookup: Map<number, CatalogPrLinkMeta>,
): Promise<boolean> {
	let changed = false;
	const completedAt = new Date().toISOString();
	for (const task of tasks) {
		if (task.status === "complete" || task.prNumber == null) continue;
		const linkedSection = getSectionNumberForPr(task.prNumber);
		if (
			linkedSection != null &&
			!sectionCompletesOnMergedCatalogPr(linkedSection)
		) {
			continue;
		}
		const meta = prLookup.get(task.prNumber);
		if (meta?.state !== "merged") continue;
		const next: RoadmapTask = {
			...task,
			status: "complete",
			completedAt: task.completedAt ?? completedAt,
			completedCommitSha:
				task.completedCommitSha ?? meta.mergeCommitSha ?? null,
		};
		await saveTask(next);
		await appendStatusLog({
			entityType: "task",
			entityId: task.$id,
			fromStatus: task.status,
			toStatus: "complete",
			actor: "system:merged-catalog-pr",
			commitSha: meta.mergeCommitSha ?? null,
			testRunId: null,
		});
		changed = true;
	}
	return changed;
}

const OVERVIEW_CACHE_MS = 15_000;
let overviewCache: { fetchedAt: number; value: RoadmapOverview } | null = null;

function invalidateOverviewCache() {
	overviewCache = null;
}

export async function getOverview(options?: {
	skipCache?: boolean;
}): Promise<RoadmapOverview> {
	if (
		!options?.skipCache &&
		overviewCache &&
		Date.now() - overviewCache.fetchedAt < OVERVIEW_CACHE_MS
	) {
		return overviewCache.value;
	}

	const [sections, tasks, openPrs] = await Promise.all([
		listSections(),
		listTasks(),
		listOpenPullRequests().catch(() => []),
	]);
	const { snapshot } = computeUnlocked({ sections, tasks });
	const unlockedSections = snapshot.sections;
	const unlockedTasks = snapshot.tasks;
	const openByNumber = new Map(openPrs.map((pr) => [pr.number, pr]));
	const allCatalogNumbers = unlockedSections.flatMap((section) =>
		getCatalogLinkedPrNumbers(section.sectionNumber),
	);
	const prLookup = await resolveCatalogPrLookup(openPrs, allCatalogNumbers);
	const mergedPrChanged = await persistTasksCompletedByMergedPrs(
		unlockedTasks,
		prLookup,
	);
	let viewSections = unlockedSections;
	let viewTasks = unlockedTasks;
	if (mergedPrChanged) {
		invalidateOverviewCache();
		const [freshSections, freshTasks] = await Promise.all([
			listSections(),
			listTasks(),
		]);
		const refreshed = computeUnlocked({
			sections: freshSections,
			tasks: freshTasks,
		});
		viewSections = refreshed.snapshot.sections;
		viewTasks = refreshed.snapshot.tasks;
		for (const section of refreshed.snapshot.sections) {
			const prev = freshSections.find((item) => item.$id === section.$id);
			if (prev && prev.status !== section.status) {
				await saveSection(section);
			}
		}
	}

	const sectionViews: RoadmapSectionOverview[] = viewSections.map(
		(section) => {
			const sectionTasks = viewTasks.filter(
				(task) => task.sectionId === section.$id,
			);
		const taskCounts = countByStatus(sectionTasks);
		const catalogNumbers = getCatalogLinkedPrNumbers(section.sectionNumber);
		const waitingNumber = catalogNumbers.find((number) =>
			openByNumber.has(number),
		);
		const prLinks = catalogNumbers.map((number) => {
			const meta = prLookup.get(number);
			return {
				number,
				title: meta?.title ?? "",
				state: meta?.state,
			};
		});
		return {
			id: section.$id,
			sectionNumber: section.sectionNumber,
			title: section.title,
			status: section.status,
			progressPercent: computeProgressPercent(sectionTasks),
			taskCounts,
			prTitle: prLinks.at(-1)?.title ?? null,
			prLinks,
			mergeBlockReason:
				section.status === "complete"
					? null
					: sectionUsesPerTaskPrCompletion(section.sectionNumber)
						? `${taskCounts.complete} of ${taskCounts.total} tasks complete`
						: waitingNumber
							? `Waiting for PR #${waitingNumber} to merge`
							: null,
		};
	});

	const overview = {
		overallProgressPercent: computeProgressPercent(viewTasks),
		sections: sectionViews,
	};
	overviewCache = { fetchedAt: Date.now(), value: overview };
	return overview;
}

export async function getSectionTaskTree(
	sectionId: string,
): Promise<{ sectionId: string; tasks: RoadmapTaskTreeNode[] }> {
	const { sections, tasks } = await persistUnlockedSnapshot();
	const section = sections.find((item) => item.$id === sectionId);
	if (!section) throw new RoadmapError("Section not found", 404);

	const mergeBlockReason =
		section.status === "complete" || sectionUsesPerTaskPrCompletion(section.sectionNumber)
			? null
			: await evaluateSectionMergeBlock(section.sectionNumber);

	const sectionTasks = tasks.filter((t) => t.sectionId === sectionId);
	const prNumbers = [
		...new Set(
			sectionTasks
				.map((t) => t.prNumber)
				.filter((n): n is number => n != null),
		),
	];
	const branchByPr = new Map<number, string>();
	await Promise.all(
		prNumbers.map(async (prNumber) => {
			const live = await fetchPullRequestStatus({ prNumber });
			if (live.headRef?.trim()) {
				branchByPr.set(prNumber, live.headRef.trim());
			}
		}),
	);

	const tree = buildTaskTree(tasks, sectionId, {
		sections,
		tasks,
		mergeBlockReasons: mergeBlockReason
			? { [section.$id]: mergeBlockReason }
			: undefined,
	});

	return {
		sectionId,
		tasks: enrichTreeWithPrBranches(tree, branchByPr),
	};
}

export async function getSectionPullRequests(sectionId: string): Promise<
	Array<{
		number: number;
		title: string;
		state: "open" | "closed" | "merged" | "unknown";
		htmlUrl: string;
		headRef: string;
		body: string;
	}>
> {
	const section = await getSectionById(sectionId);
	if (!section) throw new RoadmapError("Section not found", 404);
	const numbers = getCatalogLinkedPrNumbers(section.sectionNumber);
	return Promise.all(
		numbers.map(async (number) => {
			const live = await fetchPullRequestStatus({ prNumber: number });
			return {
				number,
				title: live.title || `PR #${number}`,
				state: live.state,
				htmlUrl: live.htmlUrl || "",
				headRef: live.headRef?.trim() || "",
				body: live.body || "",
			};
		}),
	);
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

	const alreadyBound = await getTaskByPrNumber(params.prNumber);
	if (alreadyBound && alreadyBound.$id !== task.$id) {
		throw new RoadmapError(
			`PR #${params.prNumber} is already linked to task ${alreadyBound.taskCode}`,
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
	taskCode?: string;
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
	invalidateOverviewCache();
	const live = await fetchPullRequestStatus({ prNumber: input.prNumber });
	const sectionNumber =
		getSectionNumberForPr(input.prNumber) ??
		(input.taskCode
			? Number(input.taskCode.split(".")[0])
			: undefined) ??
		resolveSectionFromPrMatch(toPrSummary(input.prNumber, live));
	const task =
		(input.taskCode ? await getTaskByCode(input.taskCode) : null) ||
		(await getTaskByPrNumber(input.prNumber)) ||
		((await getTasksByPrNumber(input.prNumber))[0] ?? null) ||
		(sectionNumber != null ? await firstTaskInSection(sectionNumber) : null);
	if (!task) {
		throw new RoadmapError(
			`Unknown prNumber/taskCode: ${input.prNumber}/${input.taskCode ?? ""}`,
			404,
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
		latestTestRunId: testRun.$id,
	};
	await saveTask(next);

	const clearedToMerge = input.result === "passed";
	const commentBody = clearedToMerge
		? `Tests passed — this PR is cleared to merge.\n\nPR #${input.prNumber} · commit \`${input.commitSha}\`\n${input.summary}\n${input.logsUrl}`
		: `Tests ${input.result} — merge is not cleared.\n\nPR #${input.prNumber} · commit \`${input.commitSha}\`\n${input.summary}\n${input.logsUrl}`;

	await appendStatusLog({
		entityType: "task",
		entityId: task.$id,
		fromStatus: task.status,
		toStatus: task.status,
		actor: "system:ci-webhook",
		commitSha: input.commitSha,
		testRunId: testRun.$id,
	});

	if (clearedToMerge) {
		const live = await fetchPullRequestStatus({ prNumber: input.prNumber });
		if (live.state === "merged" && live.mergeCommitSha) {
			await completeSectionFromMerge({
				prNumber: input.prNumber,
				mergeCommitSha: live.mergeCommitSha,
				baseBranch: "main",
			});
		}
	}

	return { task: next, testRun, clearedToMerge, commentBody };
}

export type MergeCompleteInput = {
	prNumber: number;
	mergeCommitSha: string;
	baseBranch: string;
	taskCode?: string;
};

export type MergeCompleteOutcome = {
	sectionNumber: number;
	completed: boolean;
	reason?: string;
	tasks: RoadmapTask[];
	testRun?: RoadmapTestRun;
};

/**
 * Tasks complete from a verified merge.
 * Single-PR sections: all tasks complete together.
 * Multi-PR sections: tasks bound to the merged PR, plus unlinked tasks whose
 * title/branch matches the PR (so 3.1–3.3 can finish without a pre-listed number).
 */
export async function completeSectionFromMerge(
	input: MergeCompleteInput,
): Promise<MergeCompleteOutcome> {
	invalidateOverviewCache();
	const allowedBases = new Set(["main", "master"]);
	if (!allowedBases.has(input.baseBranch)) {
		throw new RoadmapError(
			`Merge base must be main/master (got ${input.baseBranch})`,
			400,
		);
	}

	const live = await fetchPullRequestStatus({ prNumber: input.prNumber });
	const prSummary = toPrSummary(input.prNumber, live);
	const sectionNumber =
		getSectionNumberForPr(input.prNumber) ??
		resolveSectionFromPrMatch(prSummary);
	if (sectionNumber == null) {
		throw new RoadmapError(
			`PR #${input.prNumber} is not linked to a roadmap section`,
			404,
		);
	}

	const sections = await listSections();
	const section = sections.find((s) => s.sectionNumber === sectionNumber);
	if (!section) {
		throw new RoadmapError(`Section ${sectionNumber} not found`, 404);
	}

	const allTasks = await listTasks();
	const sectionTasks = allTasks.filter((t) => t.sectionId === section.$id);
	const owner = sectionTasks[0];
	if (!owner) {
		throw new RoadmapError(`Section ${sectionNumber} has no tasks`, 404);
	}

	if (ROADMAP_TRACKING_STUB_PRS.has(input.prNumber)) {
		return {
			sectionNumber,
			completed: false,
			reason: `PR #${input.prNumber} is a tracking stub — merge does not mark tasks complete`,
			tasks: sectionTasks,
		};
	}

	if (!sectionCompletesOnMergedCatalogPr(sectionNumber)) {
		return {
			sectionNumber,
			completed: false,
			reason: `Section ${sectionNumber} is a tracking stub — merge does not mark it complete`,
			tasks: sectionTasks,
		};
	}

	if (sectionTasks.every((t) => t.status === "complete")) {
		return { sectionNumber, completed: true, tasks: sectionTasks };
	}

	const priorIncomplete = sections.find(
		(s) => s.sectionNumber < sectionNumber && s.status !== "complete",
	);
	if (priorIncomplete) {
		return {
			sectionNumber,
			completed: false,
			reason: `Finish section ${priorIncomplete.sectionNumber} (${priorIncomplete.title}) first`,
			tasks: sectionTasks,
		};
	}

	let testRun = await findTestRunForPrCommit({
		prNumber: input.prNumber,
		commitSha: input.mergeCommitSha,
		result: "passed",
	});

	if (!testRun) {
		testRun = await createTestRun({
			taskId: owner.$id,
			prNumber: input.prNumber,
			commitSha: input.mergeCommitSha,
			triggeredBy: "pre_merge_recheck",
			result: "pending",
			logsUrl: "",
			summary: "Awaiting recheck on merge commit",
			finishedAt: null,
		});
		return {
			sectionNumber,
			completed: false,
			reason: `PR #${input.prNumber}: no passing test run on ${input.mergeCommitSha}`,
			tasks: sectionTasks,
			testRun,
		};
	}

	const perTaskPr = sectionUsesPerTaskPrCompletion(sectionNumber);
	const tasksToComplete = perTaskPr
		? sectionTasks.filter((t) => {
				if (t.status === "complete") return false;
				if (t.prNumber === input.prNumber) return true;
				// Unlinked tasks complete when the PR title/branch names the task code.
				if (t.prNumber == null) {
					return matchPullRequestToTask(prSummary, sectionNumber, t.taskCode);
				}
				return false;
			})
		: sectionTasks.filter((t) => t.status !== "complete");

	if (!perTaskPr) {
		const block = await evaluateSectionMergeBlock(sectionNumber, {
			triggeringPr: {
				prNumber: input.prNumber,
				mergeCommitSha: input.mergeCommitSha,
			},
		});
		if (block) {
			return {
				sectionNumber,
				completed: false,
				reason: block,
				tasks: sectionTasks,
				testRun,
			};
		}
	}

	if (tasksToComplete.length === 0) {
		await persistUnlockedSnapshot();
		const refreshed = (await listTasks()).filter((t) => t.sectionId === section.$id);
		return {
			sectionNumber,
			completed: refreshed.every((t) => t.status === "complete"),
			reason: perTaskPr
				? `PR #${input.prNumber} tasks already complete`
				: undefined,
			tasks: refreshed,
			testRun,
		};
	}

	const completedAt = new Date().toISOString();
	const updated: RoadmapTask[] = [];
	for (const task of sectionTasks) {
		if (!tasksToComplete.some((t) => t.$id === task.$id)) {
			updated.push(task);
			continue;
		}
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
			fromStatus: task.status,
			toStatus: "complete",
			actor: "system:merge-webhook",
			commitSha: input.mergeCommitSha,
			testRunId: testRun.$id,
		});
		updated.push(next);
	}

	await persistUnlockedSnapshot();
	const refreshed = (await listTasks()).filter((t) => t.sectionId === section.$id);
	const sectionComplete = refreshed.every((t) => t.status === "complete");
	return {
		sectionNumber,
		completed: sectionComplete,
		reason: sectionComplete
			? undefined
			: perTaskPr
				? `${refreshed.filter((t) => t.status === "complete").length} of ${refreshed.length} tasks complete`
				: undefined,
		tasks: refreshed,
		testRun,
	};
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
	invalidateOverviewCache();
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
