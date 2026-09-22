import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import {
	appwriteConfig,
	isAppwriteConfigured,
	isTestAppwriteConfig,
} from "@/lib/appwrite/config";
import type { RoadmapTask } from "./types";

/** One-time source: rows in npo_roadmap_task_overrides before full npo_roadmap_tasks seed. */
export async function mergeLegacyNpoOverrideCompletions(
	tasks: RoadmapTask[],
): Promise<RoadmapTask[]> {
	const tableId = appwriteConfig.npoRoadmapTaskOverridesCollectionId;
	if (
		!isAppwriteConfigured() ||
		!tableId ||
		isTestAppwriteConfig() ||
		tableId.startsWith("test-")
	) {
		return tasks;
	}

	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId,
			queries: [Query.equal("status", "complete"), Query.limit(500)],
		});
		const byCode = new Map<string, Record<string, unknown>>();
		for (const row of result.rows) {
			const data = (row as { data?: Record<string, unknown> }).data ?? row;
			const code = String(data.taskCode ?? "").trim();
			if (code) byCode.set(code, data as Record<string, unknown>);
		}
		if (!byCode.size) return tasks;

		return tasks.map((task) => {
			const row = byCode.get(task.taskCode);
			if (!row) return task;
			return {
				...task,
				status: "complete",
				completedAt: String(row.completedAt ?? task.completedAt ?? ""),
				completedCommitSha:
					row.completedCommitSha != null
						? String(row.completedCommitSha)
						: task.completedCommitSha,
				prNumber:
					task.prNumber ??
					(Number.isFinite(Number(row.prNumber))
						? Number(row.prNumber)
						: task.prNumber),
			};
		});
	} catch {
		return tasks;
	}
}
