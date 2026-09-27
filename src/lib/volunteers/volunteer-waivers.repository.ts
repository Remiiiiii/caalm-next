import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { VolunteerWaiverRecord } from "./types";

function tableId(): string {
	return (
		appwriteConfig.volunteerWaiversCollectionId || "69f0b802001f4e8c2b28"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): VolunteerWaiverRecord {
	const status =
		row.status === "sent" || row.status === "completed" || row.status === "draft"
			? row.status
			: "draft";
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		constituentId: String(row.constituentId || ""),
		envelopeId: row.envelopeId ? String(row.envelopeId) : undefined,
		documentFileId: String(row.documentFileId || ""),
		status,
		createdBy: String(row.createdBy || ""),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
	};
}

export async function findWaiverByEnvelopeId(
	envelopeId: string,
): Promise<VolunteerWaiverRecord | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [Query.equal("envelopeId", envelopeId), Query.limit(1)],
	});
	const row = result.rows[0] as Record<string, unknown> | undefined;
	return row ? mapRow(row) : null;
}

export async function listWaiversForConstituent(
	orgId: string,
	constituentId: string,
): Promise<VolunteerWaiverRecord[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("constituentId", constituentId),
			Query.limit(20),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function createVolunteerWaiverRow(input: {
	orgId: string;
	constituentId: string;
	documentFileId: string;
	envelopeId?: string;
	createdBy: string;
	status?: VolunteerWaiverRecord["status"];
}): Promise<VolunteerWaiverRecord> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			constituentId: input.constituentId,
			documentFileId: input.documentFileId,
			envelopeId: input.envelopeId,
			status: input.status || "draft",
			createdBy: input.createdBy,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateVolunteerWaiverStatus(
	orgId: string,
	waiverId: string,
	status: VolunteerWaiverRecord["status"],
	envelopeId?: string,
): Promise<VolunteerWaiverRecord | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const existing = (await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: waiverId,
		})) as Record<string, unknown>;
		if (String(existing.orgId || "") !== orgId) return null;
		const patch: Record<string, unknown> = { status };
		if (envelopeId) patch.envelopeId = envelopeId;
		const row = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: waiverId,
			data: patch,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}
