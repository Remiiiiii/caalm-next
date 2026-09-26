import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { ImportDryRunResult } from "./dry-run";

export type ImportBatchStatus = "pending" | "committed" | "failed";

export type StoredImportBatch = {
	$id: string;
	orgId: string;
	createdByUserId: string;
	status: ImportBatchStatus;
	payload: ImportDryRunResult;
	summary?: string;
	expiresAt: string;
	committedAt?: string;
};

const BATCH_TTL_MS = 24 * 60 * 60 * 1000;

function tableId(): string {
	return (
		appwriteConfig.constituentImportBatchesCollectionId ||
		"69f9a301001f4e8c2b61"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): StoredImportBatch {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		createdByUserId: String(row.createdByUserId || ""),
		status: String(row.status || "pending") as ImportBatchStatus,
		payload: JSON.parse(String(row.payload || "{}")) as ImportDryRunResult,
		summary: row.summary ? String(row.summary) : undefined,
		expiresAt: String(row.expiresAt || ""),
		committedAt: row.committedAt ? String(row.committedAt) : undefined,
	};
}

export async function createImportBatch(input: {
	orgId: string;
	createdByUserId: string;
	payload: ImportDryRunResult;
}): Promise<StoredImportBatch> {
	const { tablesDB } = await createAdminClient();
	const expiresAt = new Date(Date.now() + BATCH_TTL_MS).toISOString();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			createdByUserId: input.createdByUserId,
			status: "pending",
			payload: JSON.stringify(input.payload),
			summary: JSON.stringify(input.payload.counts),
			expiresAt,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function getImportBatch(
	orgId: string,
	batchId: string,
): Promise<StoredImportBatch | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: batchId,
		});
		const batch = mapRow(row as unknown as Record<string, unknown>);
		if (batch.orgId !== orgId) return null;
		return batch;
	} catch {
		return null;
	}
}

export async function markImportBatchCommitted(
	orgId: string,
	batchId: string,
): Promise<StoredImportBatch | null> {
	const existing = await getImportBatch(orgId, batchId);
	if (!existing) return null;
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: batchId,
		data: {
			status: "committed",
			committedAt: new Date().toISOString(),
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function markImportBatchFailed(
	orgId: string,
	batchId: string,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	try {
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: batchId,
			data: { status: "failed" },
		});
	} catch {
		// Best-effort status update.
	}
}

export function isImportBatchExpired(batch: StoredImportBatch): boolean {
	return new Date(batch.expiresAt).getTime() < Date.now();
}
