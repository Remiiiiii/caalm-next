/**
 * Roadmap business logic — tasks complete via completeSectionFromMerge()
 * only after Playwright E2E (push) + Deploy to Vercel (production) succeed.
 * Overview reconcile no longer completes on merge alone.
 */

import {
	catalogPullRequestUrl,
	getSectionNumberForPr,
	ROADMAP_TRACKING_STUB_PRS,
} from "./catalog";
import type { RoadmapCatalogKey } from "./catalog-key";
import {
	catalogKeyFromEntityId,
	DEFAULT_ROADMAP_CATALOG_KEY,
} from "./catalog-key";
import {
	catalogDisplayTitleForPrIn,
	catalogUsesSequentialTasks,
	linkedPrNumbersInCatalog,
	sectionCompletesOnMergedCatalogPrIn,
	sectionNumberForPrIn,
	sectionUsesPerTaskPrCompletionIn,
} from "./catalog-query";
import { catalogForKey } from "./catalogs";
import {
	fetchPullRequestStatus,
	fetchRoadmapCompletionGate,
	listOpenPullRequests,
} from "./github";
import {
	findSectionPullRequest,
	type GitHubPullRequestSummary,
	matchPullRequestToTask,
	type ResolvedPullRequest,
	resolveCatalogFromPrMatch,
	resolveSectionFromPrMatch,
} from "./github-pr-match";
import {
	buildTaskTree,
	computeProgressPercent,
	computeUnlocked,
	countByStatus,
	firstIncompleteSequentialTask,
} from "./locking";
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

function catalogOf(key: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY) {
	return catalogForKey(key);
}

function getCatalogLinkedPrNumbers(
	sectionNumber: number,
	key: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): number[] {
	return linkedPrNumbersInCatalog(catalogOf(key), sectionNumber);
}

function getCatalogLinkedPrNumber(
	sectionNumber: number,
	key: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): number | undefined {
	const numbers = getCatalogLinkedPrNumbers(sectionNumber, key);
	return numbers[numbers.length - 1];
}

function catalogDisplayTitleForPr(
	prNumber: number,
	key: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): string {
	return catalogDisplayTitleForPrIn(catalogOf(key), prNumber);
}

function sectionUsesPerTaskPrCompletion(
	sectionNumber: number,
	key: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): boolean {
	return sectionUsesPerTaskPrCompletionIn(catalogOf(key), sectionNumber);
}

function sectionCompletesOnMergedCatalogPr(
	sectionNumber: number,
	key: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): boolean {
	return sectionCompletesOnMergedCatalogPrIn(catalogOf(key), sectionNumber);
}

function keyFromTasks(tasks: RoadmapTask[]): RoadmapCatalogKey {
	return catalogKeyFromEntityId(tasks[0]?.$id ?? "sec_00");
}

function sequentialLockOptions(catalogKey: RoadmapCatalogKey) {
	return {
		sequentialTasks: catalogUsesSequentialTasks(catalogOf(catalogKey)),
	};
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

	const catalogKey = keyFromTasks(sectionTasks);
	const catalogPr = getCatalogLinkedPrNumber(sectionNumber, catalogKey);
	if (catalogPr) {
		const fromCatalog = await resolveFromPrNumber(catalogPr, "catalog");
		if (fromCatalog) return fromCatalog;
	}

	const discovered = findSectionPullRequest(openPrs, sectionNumber, catalogKey);
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

	const catalogKey = catalogKeyFromEntityId(task.$id);
	const prs = openPrs ?? (await listOpenPullRequests());
	const taskSpecific = prs.find((pr) =>
		matchPullRequestToTask(pr, sectionNumber, task.taskCode, catalogKey),
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
	catalogKey: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): Promise<RoadmapTask | null> {
	const sections = await listSections(catalogKey);
	const section = sections.find((s) => s.sectionNumber === sectionNumber);
	if (!section) return null;
	const tasks = await listTasks(undefined, catalogKey);
	return (
		tasks
			.filter((t) => t.sectionId === section.$id && !t.parentTaskId)
			.sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? null
	);
}

export async function evaluateSectionMergeBlock(
	sectionNumber: number,
	options?: {
		triggeringPr?: { prNumber: number; mergeCommitSha: string };
		catalogKey?: RoadmapCatalogKey;
	},
): Promise<string | null> {
	const catalogKey = options?.catalogKey ?? DEFAULT_ROADMAP_CATALOG_KEY;
	const numbers = getCatalogLinkedPrNumbers(sectionNumber, catalogKey);
	// Empty means backlog with no tracking PR yet — not a merge failure.
	if (!numbers.length) return null;

	const openNumbers = new Set(
		(await listOpenPullRequests().catch(() => [])).map((pr) => pr.number),
	);

	for (const number of numbers) {
		const isTrigger = options?.triggeringPr?.prNumber === number;
		if (isTrigger) {
			const sha = options?.triggeringPr?.mergeCommitSha;
			if (!sha) continue;
			const gate = await fetchRoadmapCompletionGate({ commitSha: sha });
			if (!gate.ok) {
				return `PR #${number}: ${gate.reason}`;
			}
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
		const gate = await fetchRoadmapCompletionGate({ commitSha: sha });
		if (!gate.ok) {
			return `PR #${number}: ${gate.reason}`;
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
	catalogKey: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): Promise<Map<number, CatalogPrLinkMeta>> {
	const lookup = new Map<number, CatalogPrLinkMeta>();
	for (const pr of openPrs) {
		lookup.set(pr.number, {
			title:
				pr.title?.trim() || catalogDisplayTitleForPr(pr.number, catalogKey),
			state: pr.state,
		});
	}
	const missing = [...new Set(catalogNumbers)].filter((n) => !lookup.has(n));
	await Promise.all(
		missing.map(async (number) => {
			const live = await fetchPullRequestStatus({ prNumber: number });
			const fallbackTitle = catalogDisplayTitleForPr(number, catalogKey);
			if (live.state === "unknown" && !live.title && !fallbackTitle) return;
			lookup.set(number, {
				title: live.title?.trim() || fallbackTitle,
				state: live.state,
				mergeCommitSha: live.mergeCommitSha,
			});
		}),
	);
	for (const number of catalogNumbers) {
		if (lookup.has(number)) continue;
		const fallbackTitle = catalogDisplayTitleForPr(number, catalogKey);
		if (!fallbackTitle) continue;
		lookup.set(number, { title: fallbackTitle, state: "unknown" });
	}
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

/**
 * Mark catalog-linked tasks complete only when the merge commit also has
 * Playwright E2E (push) + Deploy to Vercel (production) green.
 */
async function persistTasksCompletedByMergedPrs(
	tasks: RoadmapTask[],
	prLookup: Map<number, CatalogPrLinkMeta>,
	catalogKey: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): Promise<boolean> {
	let changed = false;
	const completedAt = new Date().toISOString();
	const gateBySha = new Map<
		string,
		Awaited<ReturnType<typeof fetchRoadmapCompletionGate>>
	>();

	for (const task of tasks) {
		if (task.status === "complete" || task.prNumber == null) continue;
		const linkedSection =
			sectionNumberForPrIn(catalogOf(catalogKey), task.prNumber) ??
			getSectionNumberForPr(task.prNumber);
		if (
			linkedSection != null &&
			!sectionCompletesOnMergedCatalogPr(linkedSection, catalogKey)
		) {
			continue;
		}
		const meta = prLookup.get(task.prNumber);
		if (meta?.state !== "merged") continue;
		const sha = meta.mergeCommitSha?.trim();
		if (!sha) continue;

		let gate = gateBySha.get(sha);
		if (!gate) {
			gate = await fetchRoadmapCompletionGate({ commitSha: sha });
			gateBySha.set(sha, gate);
		}
		if (!gate.ok) continue;

		const next: RoadmapTask = {
			...task,
			status: "complete",
			completedAt: task.completedAt ?? completedAt,
			completedCommitSha: task.completedCommitSha ?? sha,
		};
		await saveTask(next);
		await appendStatusLog({
			entityType: "task",
			entityId: task.$id,
			fromStatus: task.status,
			toStatus: "complete",
			actor: "system:merged-catalog-pr",
			commitSha: sha,
			testRunId: null,
		});
		changed = true;
	}
	return changed;
}

const OVERVIEW_CACHE_MS = 15_000;
const overviewCache = new Map<
	RoadmapCatalogKey,
	{ fetchedAt: number; value: RoadmapOverview }
>();

function invalidateOverviewCache(catalogKey?: RoadmapCatalogKey) {
	if (catalogKey) overviewCache.delete(catalogKey);
	else overviewCache.clear();
}

/** Vitest helper — overview cache must not survive resetRoadmapMemoryForTests. */
export function clearOverviewCacheForTests(): void {
	invalidateOverviewCache();
}

export async function getOverview(options?: {
	skipCache?: boolean;
	catalogKey?: RoadmapCatalogKey;
}): Promise<RoadmapOverview> {
	const catalogKey = options?.catalogKey ?? DEFAULT_ROADMAP_CATALOG_KEY;
	const cached = overviewCache.get(catalogKey);
	if (
		!options?.skipCache &&
		cached &&
		Date.now() - cached.fetchedAt < OVERVIEW_CACHE_MS
	) {
		return cached.value;
	}

	const [sections, tasks, openPrs] = await Promise.all([
		listSections(catalogKey),
		listTasks(undefined, catalogKey),
		listOpenPullRequests().catch(() => []),
	]);
	const { snapshot } = computeUnlocked({
		sections,
		tasks,
		...sequentialLockOptions(catalogKey),
	});
	const unlockedSections = snapshot.sections;
	const unlockedTasks = snapshot.tasks;
	const openByNumber = new Map(openPrs.map((pr) => [pr.number, pr]));
	const allCatalogNumbers = unlockedSections.flatMap((section) =>
		getCatalogLinkedPrNumbers(section.sectionNumber, catalogKey),
	);
	const prLookup = await resolveCatalogPrLookup(
		openPrs,
		allCatalogNumbers,
		catalogKey,
	);
	const mergedPrChanged = await persistTasksCompletedByMergedPrs(
		unlockedTasks,
		prLookup,
		catalogKey,
	);

	// Same completion gate used to finish sections — used for PR strikethrough UI
	const checksPassedByPr = new Map<number, boolean>();
	const gateReasonByPr = new Map<number, string>();
	const gateBySha = new Map<
		string,
		Awaited<ReturnType<typeof fetchRoadmapCompletionGate>>
	>();
	await Promise.all(
		[...prLookup.entries()].map(async ([number, meta]) => {
			if (meta.state !== "merged") {
				checksPassedByPr.set(number, false);
				return;
			}
			const sha = meta.mergeCommitSha?.trim();
			if (!sha) {
				checksPassedByPr.set(number, false);
				gateReasonByPr.set(number, "missing merge commit");
				return;
			}
			let gate = gateBySha.get(sha);
			if (!gate) {
				gate = await fetchRoadmapCompletionGate({ commitSha: sha });
				gateBySha.set(sha, gate);
			}
			checksPassedByPr.set(number, gate.ok);
			if (!gate.ok && gate.reason) {
				gateReasonByPr.set(number, gate.reason);
			}
		}),
	);

	let viewSections = unlockedSections;
	let viewTasks = unlockedTasks;
	if (mergedPrChanged) {
		invalidateOverviewCache(catalogKey);
		const [freshSections, freshTasks] = await Promise.all([
			listSections(catalogKey),
			listTasks(undefined, catalogKey),
		]);
		const refreshed = computeUnlocked({
			sections: freshSections,
			tasks: freshTasks,
			...sequentialLockOptions(catalogKey),
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

	const sectionViews: RoadmapSectionOverview[] = viewSections.map((section) => {
		const sectionTasks = viewTasks.filter(
			(task) => task.sectionId === section.$id,
		);
		const taskCounts = countByStatus(sectionTasks);
		const catalogNumbers = getCatalogLinkedPrNumbers(
			section.sectionNumber,
			catalogKey,
		);
		const waitingNumber = catalogNumbers.find((number) =>
			openByNumber.has(number),
		);
		const prLinks = catalogNumbers.map((number) => {
			const meta = prLookup.get(number);
			return {
				number,
				title:
					meta?.title?.trim() ||
					catalogDisplayTitleForPr(number, catalogKey) ||
					"",
				state: meta?.state,
				checksPassed: checksPassedByPr.get(number) === true,
			};
		});
		const waitingChecksNumber = catalogNumbers.find(
			(number) =>
				prLookup.get(number)?.state === "merged" &&
				checksPassedByPr.get(number) !== true,
		);
		const sequential = catalogUsesSequentialTasks(catalogOf(catalogKey));
		const nextTask =
			section.status === "complete" || !sequential
				? undefined
				: firstIncompleteSequentialTask(sectionTasks, section.$id);
		const perTask = sectionUsesPerTaskPrCompletion(
			section.sectionNumber,
			catalogKey,
		);
		return {
			id: section.$id,
			sectionNumber: section.sectionNumber,
			title: section.title,
			status: section.status,
			progressPercent: computeProgressPercent(sectionTasks),
			taskCounts,
			prTitle: prLinks.at(-1)?.title ?? null,
			prLinks,
			nextTaskCode: nextTask?.taskCode ?? null,
			nextTaskTitle: nextTask?.title ?? null,
			mergeBlockReason:
				section.status === "complete"
					? null
					: nextTask
						? `Next: ${nextTask.taskCode} ${nextTask.title} — finish this PR before later tasks unlock`
						: perTask
							? `${taskCounts.complete} of ${taskCounts.total} tasks complete`
							: waitingNumber
								? `Waiting for PR #${waitingNumber} to merge`
								: waitingChecksNumber
									? `PR #${waitingChecksNumber}: ${
											gateReasonByPr.get(waitingChecksNumber) ||
											"Waiting for required checks"
										}`
									: null,
		};
	});

	const overview = {
		overallProgressPercent: computeProgressPercent(viewTasks),
		sections: sectionViews,
	};
	overviewCache.set(catalogKey, { fetchedAt: Date.now(), value: overview });
	return overview;
}

export async function getSectionTaskTree(
	sectionId: string,
): Promise<{ sectionId: string; tasks: RoadmapTaskTreeNode[] }> {
	const catalogKey = catalogKeyFromEntityId(sectionId);
	const { sections, tasks } = await persistUnlockedSnapshot(catalogKey);
	const section = sections.find((item) => item.$id === sectionId);
	if (!section) throw new RoadmapError("Section not found", 404);

	const mergeBlockReason =
		section.status === "complete" ||
		sectionUsesPerTaskPrCompletion(section.sectionNumber, catalogKey)
			? null
			: await evaluateSectionMergeBlock(section.sectionNumber, {
					catalogKey,
				});

	const sectionTasks = tasks.filter((t) => t.sectionId === sectionId);
	const prNumbers = [
		...new Set(
			sectionTasks.map((t) => t.prNumber).filter((n): n is number => n != null),
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
		checksPassed: boolean;
	}>
> {
	const section = await getSectionById(sectionId);
	if (!section) throw new RoadmapError("Section not found", 404);
	const catalogKey = catalogKeyFromEntityId(sectionId);
	const numbers = getCatalogLinkedPrNumbers(section.sectionNumber, catalogKey);
	return Promise.all(
		numbers.map(async (number) => {
			const live = await fetchPullRequestStatus({ prNumber: number });
			let checksPassed = false;
			if (live.state === "merged" && live.mergeCommitSha?.trim()) {
				const gate = await fetchRoadmapCompletionGate({
					commitSha: live.mergeCommitSha.trim(),
				});
				checksPassed = gate.ok;
			}
			return {
				number,
				title:
					live.title?.trim() ||
					catalogDisplayTitleForPr(number, catalogKey) ||
					`PR #${number}`,
				state: live.state,
				htmlUrl: live.htmlUrl || catalogPullRequestUrl(number),
				headRef: live.headRef?.trim() || "",
				body: live.body || "",
				checksPassed,
			};
		}),
	);
}

export async function getTaskDetail(taskId: string) {
	await persistUnlockedSnapshot(catalogKeyFromEntityId(taskId));
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
	await persistUnlockedSnapshot(catalogKeyFromEntityId(params.taskId));
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
	const prSummary = toPrSummary(input.prNumber, live);
	const catalogMatch = resolveCatalogFromPrMatch(prSummary);
	const catalogKey = catalogMatch?.catalogKey ?? DEFAULT_ROADMAP_CATALOG_KEY;
	const sectionNumber =
		sectionNumberForPrIn(catalogOf(catalogKey), input.prNumber) ??
		getSectionNumberForPr(input.prNumber) ??
		(input.taskCode ? Number(input.taskCode.split(".")[0]) : undefined) ??
		catalogMatch?.sectionNumber;
	const task =
		(input.taskCode ? await getTaskByCode(input.taskCode, catalogKey) : null) ||
		(await getTaskByPrNumber(input.prNumber)) ||
		((await getTasksByPrNumber(input.prNumber))[0] ?? null) ||
		(sectionNumber != null
			? await firstTaskInSection(sectionNumber, catalogKey)
			: null);
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
 * Tasks complete from a verified merge + required CI checks.
 * Single-PR sections: all tasks complete together.
 * Multi-PR sections: tasks bound to the merged PR, plus unlinked tasks whose
 * title/branch matches the PR (so 3.1–3.3 can finish without a pre-listed number).
 *
 * Required checks on the merge commit:
 * - Tests and Vercel deploy / Playwright E2E (push)
 * - Tests and Vercel deploy / Deploy to Vercel (production)
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
	const catalogMatch = resolveCatalogFromPrMatch(prSummary);
	const catalogKey = catalogMatch?.catalogKey ?? DEFAULT_ROADMAP_CATALOG_KEY;
	const sectionNumber =
		sectionNumberForPrIn(catalogOf(catalogKey), input.prNumber) ??
		getSectionNumberForPr(input.prNumber) ??
		catalogMatch?.sectionNumber ??
		resolveSectionFromPrMatch(prSummary);
	if (sectionNumber == null) {
		throw new RoadmapError(
			`PR #${input.prNumber} is not linked to a roadmap section`,
			404,
		);
	}

	const sections = await listSections(catalogKey);
	const section = sections.find((s) => s.sectionNumber === sectionNumber);
	if (!section) {
		throw new RoadmapError(`Section ${sectionNumber} not found`, 404);
	}

	const allTasks = await listTasks(undefined, catalogKey);
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

	if (!sectionCompletesOnMergedCatalogPr(sectionNumber, catalogKey)) {
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

	const gate = await fetchRoadmapCompletionGate({
		commitSha: input.mergeCommitSha,
	});
	if (!gate.ok) {
		return {
			sectionNumber,
			completed: false,
			reason:
				gate.reason ||
				`PR #${input.prNumber}: required CI checks not green on ${input.mergeCommitSha}`,
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

	const perTaskPr = sectionUsesPerTaskPrCompletion(sectionNumber, catalogKey);
	const tasksToComplete = perTaskPr
		? sectionTasks.filter((t) => {
				if (t.status === "complete") return false;
				if (t.prNumber === input.prNumber) return true;
				// Unlinked tasks complete when the PR title/branch names the task code.
				if (t.prNumber == null) {
					return matchPullRequestToTask(
						prSummary,
						sectionNumber,
						t.taskCode,
						catalogKey,
					);
				}
				return false;
			})
		: sectionTasks.filter((t) => t.status !== "complete");

	if (!perTaskPr) {
		const block = await evaluateSectionMergeBlock(sectionNumber, {
			catalogKey,
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
		await persistUnlockedSnapshot(catalogKey);
		const refreshed = (await listTasks(undefined, catalogKey)).filter(
			(t) => t.sectionId === section.$id,
		);
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

	await persistUnlockedSnapshot(catalogKey);
	const refreshed = (await listTasks(undefined, catalogKey)).filter(
		(t) => t.sectionId === section.$id,
	);
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
