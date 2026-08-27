import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	ContractObligation,
	ObligationKind,
	ObligationStatus,
} from "./types";

function tableId(): string {
	return (
		appwriteConfig.contractObligationsCollectionId || "69c4f202002b3c4d5e02"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): ContractObligation {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		contractId: String(row.contractId || ""),
		contractName: row.contractName ? String(row.contractName) : undefined,
		title: String(row.title || ""),
		description: row.description ? String(row.description) : undefined,
		kind: (row.kind as ObligationKind) || "other",
		status: (row.status as ObligationStatus) || "open",
		ownerUserId: row.ownerUserId ? String(row.ownerUserId) : undefined,
		ownerName: row.ownerName ? String(row.ownerName) : undefined,
		dueDate: row.dueDate ? String(row.dueDate) : undefined,
		reminderDaysBefore:
			row.reminderDaysBefore != null
				? Number(row.reminderDaysBefore)
				: undefined,
		linkUrl: row.linkUrl ? String(row.linkUrl) : undefined,
		renewalLinked: Boolean(row.renewalLinked),
		completedAt: row.completedAt ? String(row.completedAt) : undefined,
		createdByUserId: String(row.createdByUserId || ""),
	};
}

export async function listObligations(input: {
	orgId: string;
	contractId?: string;
	status?: ObligationStatus;
	limit?: number;
}): Promise<ContractObligation[]> {
	const { tablesDB } = await createAdminClient();
	const queries = [
		Query.equal("orgId", input.orgId),
		Query.orderAsc("dueDate"),
		Query.limit(input.limit ?? 500),
	];
	if (input.contractId) {
		queries.splice(1, 0, Query.equal("contractId", input.contractId));
	}
	if (input.status) {
		queries.splice(1, 0, Query.equal("status", input.status));
	}

	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries,
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getObligationById(
	id: string,
): Promise<ContractObligation | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export type CreateObligationInput = {
	orgId: string;
	contractId: string;
	contractName?: string;
	title: string;
	description?: string;
	kind?: ObligationKind;
	status?: ObligationStatus;
	ownerUserId?: string;
	ownerName?: string;
	dueDate?: string;
	reminderDaysBefore?: number;
	linkUrl?: string;
	renewalLinked?: boolean;
	createdByUserId: string;
};

export async function createObligation(
	input: CreateObligationInput,
): Promise<ContractObligation> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {
		orgId: input.orgId,
		contractId: input.contractId,
		title: input.title.slice(0, 256),
		kind: input.kind || "other",
		status: input.status || "open",
		renewalLinked: input.renewalLinked ?? false,
		createdByUserId: input.createdByUserId,
	};
	if (input.contractName) data.contractName = input.contractName.slice(0, 256);
	if (input.description) data.description = input.description.slice(0, 5000);
	if (input.ownerUserId) data.ownerUserId = input.ownerUserId;
	if (input.ownerName) data.ownerName = input.ownerName.slice(0, 256);
	if (input.dueDate) data.dueDate = input.dueDate;
	if (input.reminderDaysBefore != null) {
		data.reminderDaysBefore = input.reminderDaysBefore;
	}
	if (input.linkUrl) data.linkUrl = input.linkUrl.slice(0, 2048);

	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateObligation(
	id: string,
	patch: Partial<
		Omit<ContractObligation, "$id" | "$createdAt" | "$updatedAt" | "orgId">
	>,
): Promise<ContractObligation> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) data[key] = value;
	}
	if (patch.status === "done" && !patch.completedAt) {
		data.completedAt = new Date().toISOString();
	}
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: id,
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function deleteObligation(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: id,
	});
}
