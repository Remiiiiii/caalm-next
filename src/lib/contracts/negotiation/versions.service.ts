import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import type { VersionSource } from "./constants";
import { dbId, Query, versionsTable } from "./contract-scope";

export interface ContractDocumentVersion {
	$id: string;
	contractId: string;
	orgId: string;
	versionNumber: number;
	fileId: string;
	bucketFileId: string;
	extractedText: string;
	createdBy: string;
	changeSummary: string;
	source: VersionSource;
	$createdAt: string;
}

function mapVersion(row: Record<string, unknown>): ContractDocumentVersion {
	return {
		$id: String(row.$id),
		contractId: String(row.contractId || ""),
		orgId: String(row.orgId || ""),
		versionNumber: Number(row.versionNumber || 0),
		fileId: String(row.fileId || ""),
		bucketFileId: String(row.bucketFileId || ""),
		extractedText: String(row.extractedText || ""),
		createdBy: String(row.createdBy || ""),
		changeSummary: String(row.changeSummary || ""),
		source: (row.source as VersionSource) || "manual_upload",
		$createdAt: String(row.$createdAt || ""),
	};
}

export async function listVersions(
	contractId: string,
): Promise<ContractDocumentVersion[]> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: versionsTable(),
		queries: [
			Query.equal("contractId", contractId),
			Query.orderDesc("versionNumber"),
			Query.limit(50),
		],
	});
	return response.rows.map((row) =>
		mapVersion(row as unknown as Record<string, unknown>),
	);
}

export async function getVersion(
	versionId: string,
): Promise<ContractDocumentVersion | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: versionsTable(),
			rowId: versionId,
		});
		return mapVersion(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function createVersion(input: {
	contractId: string;
	orgId: string;
	extractedText: string;
	createdBy: string;
	changeSummary?: string;
	source: VersionSource;
	fileId?: string;
	bucketFileId?: string;
}): Promise<ContractDocumentVersion> {
	const existing = await listVersions(input.contractId);
	const nextNumber =
		existing.reduce((max, row) => Math.max(max, row.versionNumber), 0) + 1;
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: versionsTable(),
		rowId: ID.unique(),
		data: {
			contractId: input.contractId,
			orgId: input.orgId,
			versionNumber: nextNumber,
			fileId: input.fileId || "",
			bucketFileId: input.bucketFileId || "",
			extractedText: input.extractedText.slice(0, 65535),
			createdBy: input.createdBy,
			changeSummary: (input.changeSummary || "").slice(0, 255),
			source: input.source,
		},
	});
	return mapVersion(row as unknown as Record<string, unknown>);
}

export async function ensureFirstVersion(input: {
	contractId: string;
	orgId: string;
	extractedText: string;
	createdBy: string;
	fileId?: string;
	bucketFileId?: string;
	source?: VersionSource;
}): Promise<ContractDocumentVersion> {
	const existing = await listVersions(input.contractId);
	if (existing.length > 0) {
		return existing[existing.length - 1];
	}
	return createVersion({
		...input,
		source: input.source || "manual_upload",
		changeSummary: "First negotiation snapshot",
	});
}

export async function updateVersionBucketFileId(
	versionId: string,
	bucketFileId: string,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: versionsTable(),
		rowId: versionId,
		data: { bucketFileId },
	});
}
