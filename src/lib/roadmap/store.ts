/**
 * Roadmap persistence — memory-first (like runbooks), Appwrite when configured.
 * Collections are optional until provisioned via alphanumeric IDs in env.
 */

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig, isAppwriteConfigured } from "@/lib/appwrite/config";
import {
	ROADMAP_CATALOG,
	getCatalogLinkedPrNumbers,
	getCatalogTaskLinkedPrNumber,
} from "./catalog";
import { computeUnlocked, type LockSnapshot } from "./locking";
import type {
	RoadmapSection,
	RoadmapStatusLog,
	RoadmapTask,
	RoadmapTestRun,
} from "./types";

type MemoryState = {
	sections: Map<string, RoadmapSection>;
	tasks: Map<string, RoadmapTask>;
	testRuns: Map<string, RoadmapTestRun>;
	logs: Map<string, RoadmapStatusLog>;
	seeded: boolean;
};

declare global {
	// eslint-disable-next-line no-var
	var __caalmRoadmapMemory: MemoryState | undefined;
}

function memory(): MemoryState {
	if (!globalThis.__caalmRoadmapMemory) {
		globalThis.__caalmRoadmapMemory = {
			sections: new Map(),
			tasks: new Map(),
			testRuns: new Map(),
			logs: new Map(),
			seeded: false,
		};
	}
	return globalThis.__caalmRoadmapMemory;
}

/** Test helper — wipe in-memory state between unit tests. */
export function resetRoadmapMemoryForTests(): void {
	globalThis.__caalmRoadmapMemory = {
		sections: new Map(),
		tasks: new Map(),
		testRuns: new Map(),
		logs: new Map(),
		seeded: false,
	};
}

function nowIso(): string {
	return new Date().toISOString();
}

function id(prefix: string): string {
	return `${prefix}_${ID.unique()}`;
}

function parseStringArray(raw: unknown): string[] {
	if (Array.isArray(raw)) return raw.map(String);
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) return parsed.map(String);
		} catch {
			return raw
				.split("\n")
				.map((s) => s.trim())
				.filter(Boolean);
		}
	}
	return [];
}

function useAppwrite(): boolean {
	return (
		isAppwriteConfigured() &&
		Boolean(appwriteConfig.roadmapSectionsCollectionId) &&
		Boolean(appwriteConfig.roadmapTasksCollectionId) &&
		process.env.ROADMAP_USE_APPWRITE === "true"
	);
}

function sectionRowData(section: RoadmapSection) {
	return {
		sectionNumber: section.sectionNumber,
		title: section.title,
		sourceRef: section.sourceRef,
		status: section.status,
		orderIndex: section.orderIndex,
	};
}

function taskRowData(task: RoadmapTask) {
	return {
		sectionId: task.sectionId,
		parentTaskId: task.parentTaskId,
		taskCode: task.taskCode,
		title: task.title,
		description: task.description,
		acceptanceCriteria: task.acceptanceCriteria,
		orderIndex: task.orderIndex,
		status: task.status,
		branchName: task.branchName,
		prUrl: task.prUrl,
		prNumber: task.prNumber,
		testSuiteRef: task.testSuiteRef,
		latestTestRunId: task.latestTestRunId,
		completedAt: task.completedAt,
		completedCommitSha: task.completedCommitSha,
	};
}

let appwriteSeedPromise: Promise<void> | null = null;

/** Insert catalog sections/tasks when Appwrite tables are empty. Idempotent. */
export async function seedRoadmapToAppwriteIfEmpty(): Promise<{
	seeded: boolean;
	sectionCount: number;
	taskCount: number;
}> {
	if (
		!isAppwriteConfigured() ||
		!appwriteConfig.roadmapSectionsCollectionId ||
		!appwriteConfig.roadmapTasksCollectionId
	) {
		throw new Error("Roadmap Appwrite tables are not configured");
	}

	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId!;
	const sectionsTableId = appwriteConfig.roadmapSectionsCollectionId;
	const tasksTableId = appwriteConfig.roadmapTasksCollectionId;

	const existing = await tablesDB.listRows({
		databaseId,
		tableId: sectionsTableId,
		queries: [Query.limit(1)],
	});

	if ((existing.total ?? existing.rows.length) > 0) {
		await syncCatalogLayoutToAppwrite(tablesDB, databaseId, {
			sectionsTableId,
			tasksTableId,
		});
		return { seeded: false, sectionCount: 0, taskCount: 0 };
	}

	const { sections, tasks } = buildSeedSnapshot();

	for (const section of sections) {
		await tablesDB.createRow({
			databaseId,
			tableId: sectionsTableId,
			rowId: section.$id,
			data: sectionRowData(section),
		});
	}

	for (const task of tasks) {
		await tablesDB.createRow({
			databaseId,
			tableId: tasksTableId,
			rowId: task.$id,
			data: taskRowData(task),
		});
	}

	return {
		seeded: true,
		sectionCount: sections.length,
		taskCount: tasks.length,
	};
}

function sectionLayoutData(section: RoadmapSection) {
	return {
		sectionNumber: section.sectionNumber,
		title: section.title,
		sourceRef: section.sourceRef,
		orderIndex: section.orderIndex,
	};
}

function taskLayoutData(task: RoadmapTask) {
	return {
		sectionId: task.sectionId,
		parentTaskId: task.parentTaskId,
		taskCode: task.taskCode,
		title: task.title,
		description: task.description,
		acceptanceCriteria: task.acceptanceCriteria,
		orderIndex: task.orderIndex,
		testSuiteRef: task.testSuiteRef,
		prNumber: task.prNumber,
	};
}

/**
 * Rewrite section/task identity from catalog.
 * Same-title rows keep status/PR fields. Remapped IDs (old 5.1 e-sign vs new 5.1
 * clause library) reset so leftover complete flags do not unlock the wrong work.
 */
async function syncCatalogLayoutToAppwrite(
	tablesDB: Awaited<ReturnType<typeof createAdminClient>>["tablesDB"],
	databaseId: string,
	ids: { sectionsTableId: string; tasksTableId: string },
): Promise<void> {
	const seed = buildSeedSnapshot();
	const seedTaskIds = new Set(seed.tasks.map((task) => task.$id));

	const existingSectionRows = await tablesDB.listRows({
		databaseId,
		tableId: ids.sectionsTableId,
		queries: [Query.limit(100)],
	});
	const existingTaskRows = await tablesDB.listRows({
		databaseId,
		tableId: ids.tasksTableId,
		queries: [Query.limit(500)],
	});
	const existingSections = new Map(
		existingSectionRows.rows.map((row) => [row.$id, row as unknown as RoadmapSection]),
	);
	const existingTasks = new Map(
		existingTaskRows.rows.map((row) => [row.$id, row as unknown as RoadmapTask]),
	);

	const mergedSections = seed.sections.map((section) => {
		const existing = existingSections.get(section.$id);
		if (existing && existing.title === section.title) {
			return { ...existing, ...sectionLayoutData(section) };
		}
		return section;
	});
	const mergedTasks = seed.tasks.map((task) => {
		const byPr =
			task.prNumber != null
				? [...existingTasks.values()].find((row) => row.prNumber === task.prNumber)
				: undefined;
		if (byPr) {
			return {
				...byPr,
				...taskLayoutData(task),
				$id: task.$id,
				sectionId: task.sectionId,
				parentTaskId: task.parentTaskId,
				orderIndex: task.orderIndex,
			};
		}
		const existing = existingTasks.get(task.$id);
		if (existing && existing.title === task.title) {
			return { ...existing, ...taskLayoutData(task) };
		}
		return task;
	});

	const unlocked = computeUnlocked({
		sections: mergedSections,
		tasks: mergedTasks,
	});

	for (const section of unlocked.snapshot.sections) {
		if (existingSections.has(section.$id)) {
			await tablesDB.updateRow({
				databaseId,
				tableId: ids.sectionsTableId,
				rowId: section.$id,
				data: sectionRowData(section),
			});
		} else {
			await tablesDB.createRow({
				databaseId,
				tableId: ids.sectionsTableId,
				rowId: section.$id,
				data: sectionRowData(section),
			});
		}
	}

	for (const task of unlocked.snapshot.tasks) {
		if (existingTasks.has(task.$id)) {
			await tablesDB.updateRow({
				databaseId,
				tableId: ids.tasksTableId,
				rowId: task.$id,
				data: taskRowData(task),
			});
		} else {
			await tablesDB.createRow({
				databaseId,
				tableId: ids.tasksTableId,
				rowId: task.$id,
				data: taskRowData(task),
			});
		}
	}

	for (const row of existingTaskRows.rows) {
		if (!seedTaskIds.has(row.$id)) {
			await tablesDB.deleteRow({
				databaseId,
				tableId: ids.tasksTableId,
				rowId: row.$id,
			});
		}
	}
}

async function ensureAppwriteSeeded(): Promise<void> {
	if (!useAppwrite()) return;
	if (!appwriteSeedPromise) {
		appwriteSeedPromise = seedRoadmapToAppwriteIfEmpty()
			.then((result) => {
				if (result.seeded) {
					console.info(
						`[roadmap] Seeded Appwrite with ${result.sectionCount} sections and ${result.taskCount} tasks`,
					);
				}
			})
			.catch((error) => {
				appwriteSeedPromise = null;
				throw error;
			});
	}
	await appwriteSeedPromise;
}

export function buildSeedSnapshot(): {
	sections: RoadmapSection[];
	tasks: RoadmapTask[];
} {
	const ts = nowIso();
	const sections: RoadmapSection[] = [];
	const tasks: RoadmapTask[] = [];

	for (const catalogSection of ROADMAP_CATALOG) {
		const sectionId = `sec_${String(catalogSection.sectionNumber).padStart(2, "0")}`;
		sections.push({
			$id: sectionId,
			sectionNumber: catalogSection.sectionNumber,
			title: catalogSection.title,
			sourceRef: catalogSection.sourceRef,
			status: "locked",
			orderIndex: catalogSection.sectionNumber,
			$createdAt: ts,
			$updatedAt: ts,
		});

		const walk = (
			items: (typeof catalogSection.tasks)[number][],
			parentTaskId: string | null,
		) => {
			const sectionPrs = catalogSection.linkedPrNumbers ?? [];
			const soleSectionPr =
				sectionPrs.length === 1 ? sectionPrs[0] : undefined;

			items.forEach((item, index) => {
				const taskId = `task_${item.taskCode.replace(/\./g, "_")}`;
				tasks.push({
					$id: taskId,
					sectionId,
					parentTaskId,
					taskCode: item.taskCode,
					title: item.title,
					description: item.description,
					acceptanceCriteria: item.acceptanceCriteria,
					orderIndex: index,
					status: "locked",
					branchName: null,
					prUrl: null,
					prNumber: item.linkedPrNumber ?? soleSectionPr ?? null,
					testSuiteRef: item.testSuiteRef,
					latestTestRunId: null,
					completedAt: null,
					completedCommitSha: null,
					$createdAt: ts,
					$updatedAt: ts,
				});
				if (item.children?.length) {
					walk(item.children, taskId);
				}
			});
		};
		walk(catalogSection.tasks, null);
	}

	// Unlock section 0 / first top-level task via locking engine
	const unlocked = computeUnlocked({ sections, tasks });
	return unlocked.snapshot;
}

function ensureSeeded(): MemoryState {
	const state = memory();
	if (state.seeded) return state;
	const seed = buildSeedSnapshot();
	for (const s of seed.sections) state.sections.set(s.$id, s);
	for (const t of seed.tasks) state.tasks.set(t.$id, t);
	state.seeded = true;
	return state;
}

export async function listSections(): Promise<RoadmapSection[]> {
	const state = ensureSeeded();
	if (!useAppwrite()) {
		return [...state.sections.values()].sort(
			(a, b) => a.sectionNumber - b.sectionNumber,
		);
	}

	await ensureAppwriteSeeded();

	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapSectionsCollectionId!,
		queries: [Query.limit(100)],
	});
	return result.rows.map((row) => row as unknown as RoadmapSection);
}

function enrichTaskPrFromCatalog(task: RoadmapTask): RoadmapTask {
	if (task.prNumber != null) return task;
	const fromCatalog = getCatalogTaskLinkedPrNumber(task.taskCode);
	if (fromCatalog != null) {
		return { ...task, prNumber: fromCatalog };
	}
	const sectionNumber = Number(task.taskCode.split(".")[0]);
	if (Number.isNaN(sectionNumber)) return task;
	const sectionPrs = getCatalogLinkedPrNumbers(sectionNumber);
	if (sectionPrs.length === 1) {
		return { ...task, prNumber: sectionPrs[0] };
	}
	return task;
}

export async function listTasks(sectionId?: string): Promise<RoadmapTask[]> {
	const state = ensureSeeded();
	if (!useAppwrite()) {
		const all = [...state.tasks.values()].map(enrichTaskPrFromCatalog);
		return (sectionId ? all.filter((t) => t.sectionId === sectionId) : all).sort(
			(a, b) => a.orderIndex - b.orderIndex,
		);
	}

	await ensureAppwriteSeeded();

	const { tablesDB } = await createAdminClient();
	const queries = [Query.limit(500)];
	if (sectionId) queries.unshift(Query.equal("sectionId", sectionId));
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapTasksCollectionId!,
		queries,
	});
	return result.rows.map((row) => {
		const r = row as Record<string, unknown>;
		const task = enrichTaskPrFromCatalog({
			...(r as unknown as RoadmapTask),
			acceptanceCriteria: parseStringArray(r.acceptanceCriteria),
			parentTaskId: r.parentTaskId ? String(r.parentTaskId) : null,
		});
		return task;
	});
}

export async function getTaskById(taskId: string): Promise<RoadmapTask | null> {
	const state = ensureSeeded();
	if (!useAppwrite()) {
		return state.tasks.get(taskId) || null;
	}
	await ensureAppwriteSeeded();
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.roadmapTasksCollectionId!,
			rowId: taskId,
		});
		const r = row as Record<string, unknown>;
		return {
			...(r as unknown as RoadmapTask),
			acceptanceCriteria: parseStringArray(r.acceptanceCriteria),
			parentTaskId: r.parentTaskId ? String(r.parentTaskId) : null,
		};
	} catch {
		return null;
	}
}

export async function getTaskByCode(
	taskCode: string,
): Promise<RoadmapTask | null> {
	const tasks = await listTasks();
	return tasks.find((t) => t.taskCode === taskCode) || null;
}

export async function getTaskByPrNumber(
	prNumber: number,
): Promise<RoadmapTask | null> {
	const matches = await getTasksByPrNumber(prNumber);
	return matches[0] ?? null;
}

export async function getTasksByPrNumber(
	prNumber: number,
): Promise<RoadmapTask[]> {
	const tasks = await listTasks();
	return tasks.filter((t) => t.prNumber === prNumber);
}

export async function getSectionById(
	sectionId: string,
): Promise<RoadmapSection | null> {
	const sections = await listSections();
	return sections.find((s) => s.$id === sectionId) || null;
}

export async function saveTask(task: RoadmapTask): Promise<RoadmapTask> {
	const state = ensureSeeded();
	const next = { ...task, $updatedAt: nowIso() };
	if (!useAppwrite()) {
		state.tasks.set(next.$id, next);
		return next;
	}
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapTasksCollectionId!,
		rowId: next.$id,
		data: taskRowData(next),
	});
	return next;
}

export async function saveSection(
	section: RoadmapSection,
): Promise<RoadmapSection> {
	const state = ensureSeeded();
	const next = { ...section, $updatedAt: nowIso() };
	if (!useAppwrite()) {
		state.sections.set(next.$id, next);
		return next;
	}
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapSectionsCollectionId!,
		rowId: next.$id,
		data: sectionRowData(next),
	});
	return next;
}

export async function appendStatusLog(
	entry: Omit<RoadmapStatusLog, "$id" | "$createdAt">,
): Promise<RoadmapStatusLog> {
	const state = ensureSeeded();
	const log: RoadmapStatusLog = {
		...entry,
		$id: id("log"),
		$createdAt: nowIso(),
	};
	if (!useAppwrite()) {
		state.logs.set(log.$id, log);
		return log;
	}
	const { tablesDB } = await createAdminClient();
	const created = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapStatusLogCollectionId!,
		rowId: log.$id,
		data: {
			entityType: log.entityType,
			entityId: log.entityId,
			fromStatus: log.fromStatus,
			toStatus: log.toStatus,
			actor: log.actor,
			commitSha: log.commitSha,
			testRunId: log.testRunId,
		},
	});
	return { ...log, $id: String(created.$id) };
}

export async function listStatusLogs(
	entityId: string,
): Promise<RoadmapStatusLog[]> {
	const state = ensureSeeded();
	if (!useAppwrite()) {
		return [...state.logs.values()]
			.filter((l) => l.entityId === entityId)
			.sort((a, b) => a.$createdAt.localeCompare(b.$createdAt));
	}
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapStatusLogCollectionId!,
		queries: [
			Query.equal("entityId", entityId),
			Query.orderAsc("$createdAt"),
			Query.limit(200),
		],
	});
	return result.rows.map((r) => r as unknown as RoadmapStatusLog);
}

export async function createTestRun(
	input: Omit<RoadmapTestRun, "$id" | "startedAt" | "finishedAt"> & {
		startedAt?: string;
		finishedAt?: string | null;
	},
): Promise<RoadmapTestRun> {
	const state = ensureSeeded();
	const run: RoadmapTestRun = {
		...input,
		$id: id("run"),
		startedAt: input.startedAt || nowIso(),
		finishedAt: input.finishedAt ?? nowIso(),
	};
	if (!useAppwrite()) {
		state.testRuns.set(run.$id, run);
		return run;
	}
	const { tablesDB } = await createAdminClient();
	const created = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapTestRunsCollectionId!,
		rowId: run.$id,
		data: {
			taskId: run.taskId,
			prNumber: run.prNumber,
			commitSha: run.commitSha,
			triggeredBy: run.triggeredBy,
			result: run.result,
			logsUrl: run.logsUrl,
			summary: run.summary,
			startedAt: run.startedAt,
			finishedAt: run.finishedAt,
		},
	});
	return { ...run, $id: String(created.$id) };
}

export async function getTestRunById(
	runId: string,
): Promise<RoadmapTestRun | null> {
	const state = ensureSeeded();
	if (!useAppwrite()) {
		return state.testRuns.get(runId) || null;
	}
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.roadmapTestRunsCollectionId!,
			rowId: runId,
		});
		return row as unknown as RoadmapTestRun;
	} catch {
		return null;
	}
}

export async function findTestRunForCommit(params: {
	taskId: string;
	commitSha: string;
	result?: string;
}): Promise<RoadmapTestRun | null> {
	const state = ensureSeeded();
	const runs = !useAppwrite()
		? [...state.testRuns.values()]
		: await (async () => {
				const { tablesDB } = await createAdminClient();
				const result = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.roadmapTestRunsCollectionId!,
					queries: [
						Query.equal("taskId", params.taskId),
						Query.equal("commitSha", params.commitSha),
						Query.limit(20),
					],
				});
				return result.rows.map((r) => r as unknown as RoadmapTestRun);
			})();

	const filtered = runs.filter((r) => {
		if (r.taskId !== params.taskId) return false;
		if (r.commitSha !== params.commitSha) return false;
		if (params.result && r.result !== params.result) return false;
		return true;
	});
	return filtered.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null;
}

export async function findTestRunForPrCommit(params: {
	prNumber: number;
	commitSha: string;
	result?: string;
}): Promise<RoadmapTestRun | null> {
	const state = ensureSeeded();
	const runs = !useAppwrite()
		? [...state.testRuns.values()]
		: await (async () => {
				const { tablesDB } = await createAdminClient();
				const result = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.roadmapTestRunsCollectionId!,
					queries: [
						Query.equal("prNumber", params.prNumber),
						Query.equal("commitSha", params.commitSha),
						Query.limit(20),
					],
				});
				return result.rows.map((r) => r as unknown as RoadmapTestRun);
			})();

	const filtered = runs.filter((r) => {
		if (r.prNumber !== params.prNumber) return false;
		if (r.commitSha !== params.commitSha) return false;
		if (params.result && r.result !== params.result) return false;
		return true;
	});
	return (
		filtered.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null
	);
}

export async function persistUnlockedSnapshot(): Promise<LockSnapshot> {
	const sections = await listSections();
	const tasks = await listTasks();
	const { snapshot, transitions } = computeUnlocked({ sections, tasks });

	for (const s of snapshot.sections) {
		const prev = sections.find((x) => x.$id === s.$id);
		if (prev && prev.status !== s.status) {
			await saveSection(s);
		} else if (!useAppwrite()) {
			await saveSection(s);
		}
	}
	for (const t of snapshot.tasks) {
		const prev = tasks.find((x) => x.$id === t.$id);
		if (prev && prev.status !== t.status) {
			await saveTask(t);
		} else if (!useAppwrite()) {
			await saveTask(t);
		}
	}

	for (const tr of transitions) {
		await appendStatusLog({
			entityType: tr.entityType,
			entityId: tr.entityId,
			fromStatus: tr.fromStatus,
			toStatus: tr.toStatus,
			actor: "system:lock-engine",
			commitSha: null,
			testRunId: null,
		});
	}

	return snapshot;
}
