import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import {
	appwriteConfig,
	isAppwriteConfigured,
	isTestAppwriteConfig,
} from "@/lib/appwrite/config";
import type { RoadmapTask } from "./types";

export type NpoTaskCompletionOverride = {
	taskCode: string;
	status: "complete";
	prNumber: number;
	completedAt: string;
	completedCommitSha: string | null;
};

function parseOverrideRow(row: Record<string, unknown>): NpoTaskCompletionOverride | null {
	const taskCode = String(row.taskCode ?? "").trim();
	if (!taskCode) return null;
	if (row.status !== "complete") return null;
	const prNumber = Number(row.prNumber);
	if (!Number.isFinite(prNumber)) return null;
	const completedAt = String(row.completedAt ?? "").trim();
	if (!completedAt) return null;
	const sha = row.completedCommitSha;
	return {
		taskCode,
		status: "complete",
		prNumber,
		completedAt,
		completedCommitSha: sha != null && String(sha).trim() ? String(sha) : null,
	};
}

/** Admin rows in npo_roadmap_task_overrides (MCP / console) — not user force-complete. */
export async function fetchNpoTaskCompletionOverrides(): Promise<
	Map<string, NpoTaskCompletionOverride>
> {
	const tableId = appwriteConfig.npoRoadmapTaskOverridesCollectionId;
	if (
		!isAppwriteConfigured() ||
		!tableId ||
		isTestAppwriteConfig()
	) {
		return new Map();
	}

	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId,
		queries: [Query.equal("status", "complete"), Query.limit(500)],
	});

	const map = new Map<string, NpoTaskCompletionOverride>();
	for (const row of result.rows) {
		const parsed = parseOverrideRow(row as Record<string, unknown>);
		if (parsed) map.set(parsed.taskCode, parsed);
	}
	return map;
}

export function applyNpoTaskCompletionOverrides(
	tasks: RoadmapTask[],
	overrides: Map<string, NpoTaskCompletionOverride>,
): RoadmapTask[] {
	if (!overrides.size) return tasks;
	return tasks.map((task) => {
		const override = overrides.get(task.taskCode);
		if (!override) return task;
		return {
			...task,
			status: "complete",
			completedAt: override.completedAt,
			completedCommitSha: override.completedCommitSha,
			prNumber: task.prNumber ?? override.prNumber,
		};
	});
}
