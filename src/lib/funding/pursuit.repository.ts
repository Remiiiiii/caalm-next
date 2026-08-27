import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { FundingPursuit, PursuitSource, PursuitStage } from "./types";

function tableId(): string {
	return (
		appwriteConfig.fundingPursuitsCollectionId || "69c4f201001a2b3c4d01"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): FundingPursuit {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		title: String(row.title || ""),
		description: row.description ? String(row.description) : undefined,
		amount: Number(row.amount || 0),
		currency: String(row.currency || "USD"),
		stage: (row.stage as PursuitStage) || "watching",
		source: (row.source as PursuitSource) || "manual",
		samNoticeId: row.samNoticeId ? String(row.samNoticeId) : undefined,
		samUrl: row.samUrl ? String(row.samUrl) : undefined,
		responseDeadline: row.responseDeadline
			? String(row.responseDeadline)
			: undefined,
		ownerUserId: row.ownerUserId ? String(row.ownerUserId) : undefined,
		ownerName: row.ownerName ? String(row.ownerName) : undefined,
		department: row.department ? String(row.department) : undefined,
		notes: row.notes ? String(row.notes) : undefined,
		linkedProposalId: row.linkedProposalId
			? String(row.linkedProposalId)
			: undefined,
		createdByUserId: String(row.createdByUserId || ""),
		createdByName: row.createdByName ? String(row.createdByName) : undefined,
	};
}

export async function listPursuits(input: {
	orgId: string;
	stage?: PursuitStage;
	limit?: number;
}): Promise<FundingPursuit[]> {
	const { tablesDB } = await createAdminClient();
	const queries = [
		Query.equal("orgId", input.orgId),
		Query.orderDesc("amount"),
		Query.limit(input.limit ?? 200),
	];
	if (input.stage) queries.splice(1, 0, Query.equal("stage", input.stage));

	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries,
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getPursuitById(
	pursuitId: string,
): Promise<FundingPursuit | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: pursuitId,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export type CreatePursuitInput = {
	orgId: string;
	title: string;
	description?: string;
	amount: number;
	currency?: string;
	stage?: PursuitStage;
	source?: PursuitSource;
	samNoticeId?: string;
	samUrl?: string;
	responseDeadline?: string;
	ownerUserId?: string;
	ownerName?: string;
	department?: string;
	notes?: string;
	createdByUserId: string;
	createdByName?: string;
};

export async function createPursuit(
	input: CreatePursuitInput,
): Promise<FundingPursuit> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {
		orgId: input.orgId,
		title: input.title.slice(0, 256),
		amount: input.amount,
		currency: input.currency || "USD",
		stage: input.stage || "watching",
		source: input.source || "manual",
		createdByUserId: input.createdByUserId,
	};
	if (input.description) data.description = input.description.slice(0, 5000);
	if (input.samNoticeId) data.samNoticeId = input.samNoticeId.slice(0, 128);
	if (input.samUrl) data.samUrl = input.samUrl.slice(0, 2048);
	if (input.responseDeadline) data.responseDeadline = input.responseDeadline;
	if (input.ownerUserId) data.ownerUserId = input.ownerUserId;
	if (input.ownerName) data.ownerName = input.ownerName.slice(0, 256);
	if (input.department) data.department = input.department.slice(0, 256);
	if (input.notes) data.notes = input.notes.slice(0, 5000);
	if (input.createdByName) {
		data.createdByName = input.createdByName.slice(0, 256);
	}

	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updatePursuit(
	pursuitId: string,
	patch: Partial<
		Omit<FundingPursuit, "$id" | "$createdAt" | "$updatedAt" | "orgId">
	>,
): Promise<FundingPursuit> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) data[key] = value;
	}
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: pursuitId,
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function deletePursuit(pursuitId: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: pursuitId,
	});
}
