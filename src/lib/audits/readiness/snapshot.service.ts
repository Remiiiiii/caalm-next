import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { ComplianceRagStatus } from "@/lib/audits/types";
import type {
	AuditCadence,
	AuditReadinessSnapshotPayload,
	AuditReadinessSnapshotRecord,
} from "./types";

function tableId(): string {
	return (
		appwriteConfig.auditReadinessSnapshotsCollectionId ||
		"66ea192923722f767a74"
	);
}

function parseRecord(
	row: Record<string, unknown>,
): AuditReadinessSnapshotRecord {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId),
		cadence: row.cadence as AuditCadence,
		score: row.score === null || row.score === undefined ? null : Number(row.score),
		ragStatus: (row.ragStatus as ComplianceRagStatus | null) ?? null,
		timezone: String(row.timezone || "America/New_York"),
		payload: String(row.payload || "{}"),
		aiSummary: row.aiSummary ? String(row.aiSummary) : undefined,
		createdAt: String(row.$createdAt || row.createdAt || new Date().toISOString()),
	};
}

export function parseSnapshotPayload(
	payload: string,
): AuditReadinessSnapshotPayload | null {
	try {
		return JSON.parse(payload) as AuditReadinessSnapshotPayload;
	} catch {
		return null;
	}
}

export async function createReadinessSnapshot(input: {
	orgId: string;
	cadence: AuditCadence;
	score: number | null;
	ragStatus: ComplianceRagStatus | null;
	timezone: string;
	payload: AuditReadinessSnapshotPayload;
	aiSummary?: string;
}): Promise<AuditReadinessSnapshotRecord> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			cadence: input.cadence,
			score: input.score,
			ragStatus: input.ragStatus,
			timezone: input.timezone,
			payload: JSON.stringify(input.payload),
			aiSummary: input.aiSummary || "",
		},
	});
	return parseRecord(row as unknown as Record<string, unknown>);
}

export async function listReadinessSnapshots(options: {
	orgId: string;
	cadence?: AuditCadence;
	limit?: number;
}): Promise<AuditReadinessSnapshotRecord[]> {
	const { tablesDB } = await createAdminClient();
	const queries = [
		Query.equal("orgId", options.orgId),
		Query.orderDesc("$createdAt"),
		Query.limit(options.limit ?? 30),
	];
	if (options.cadence) {
		queries.unshift(Query.equal("cadence", options.cadence));
	}

	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		queries,
	});

	return result.rows.map((row) =>
		parseRecord(row as unknown as Record<string, unknown>),
	);
}

export async function getLatestSnapshot(
	orgId: string,
	cadence?: AuditCadence,
): Promise<AuditReadinessSnapshotRecord | null> {
	const rows = await listReadinessSnapshots({
		orgId,
		cadence,
		limit: 1,
	});
	return rows[0] ?? null;
}

/** Prevent duplicate cadence runs on the same local calendar day */
export async function hasSnapshotOnLocalDay(options: {
	orgId: string;
	cadence: AuditCadence;
	dayKey: string;
	timezone: string;
}): Promise<boolean> {
	const recent = await listReadinessSnapshots({
		orgId: options.orgId,
		cadence: options.cadence,
		limit: 5,
	});
	const { localDayKey } = await import("./timezone");
	return recent.some((row) => {
		const created = new Date(row.createdAt);
		return localDayKey(created, options.timezone) === options.dayKey;
	});
}
