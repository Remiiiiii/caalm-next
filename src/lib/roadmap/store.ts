/**
 * Roadmap persistence — memory-first (like runbooks), Appwrite when configured.
 * Collections are optional until provisioned via alphanumeric IDs in env.
 */

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig, isAppwriteConfigured } from "@/lib/appwrite/config";
import { ROADMAP_CATALOG } from "./catalog";
import { computeUnlocked } from "./locking";
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
					prNumber: null,
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

	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.roadmapSectionsCollectionId!,
		queries: [Query.limit(100)],
	});
	return result.rows.map((row) => row as unknown as RoadmapSection);
}

export async function listTasks(sectionId?: string): Promise<RoadmapTask[]> {
	const state = ensureSeeded();
	if (!useAppwrite()) {
		const all = [...state.tasks.values()];
		return (sectionId ? all.filter((t) => t.sectionId === sectionId) : all).sort(
			(a, b) => a.orderIndex - b.orderIndex,
		);
	}

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
		return {
			...(r as unknown as RoadmapTask),
			acceptanceCriteria: parseStringArray(r.acceptanceCriteria),
			parentTaskId: r.parentTaskId ? String(r.parentTaskId) : null,
		};
	});
}

export async function getTaskById(taskId: string): Promise<RoadmapTask | null> {
	const state = ensureSeeded();
	if (!useAppwrite()) {
		return state.tasks.get(taskId) || null;
	}
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
	const tasks = await listTasks();
	return tasks.find((t) => t.prNumber === prNumber) || null;
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
		data: {
			sectionId: next.sectionId,
			parentTaskId: next.parentTaskId,
			taskCode: next.taskCode,
			title: next.title,
			description: next.description,
			acceptanceCriteria: next.acceptanceCriteria,
			orderIndex: next.orderIndex,
			status: next.status,
			branchName: next.branchName,
			prUrl: next.prUrl,
			prNumber: next.prNumber,
			testSuiteRef: next.testSuiteRef,
			latestTestRunId: next.latestTestRunId,
			completedAt: next.completedAt,
			completedCommitSha: next.completedCommitSha,
		},
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
		data: {
			sectionNumber: next.sectionNumber,
			title: next.title,
			sourceRef: next.sourceRef,
			status: next.status,
			orderIndex: next.orderIndex,
		},
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

export async function persistUnlockedSnapshot(): Promise<void> {
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
}
