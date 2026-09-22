import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from "./types";

const PAGE_SIZE_MAX = 100;

function tableId(): string {
	return appwriteConfig.campaignsCollectionId || "69d91202001f4e8c2b02";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): Campaign {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		name: String(row.name || ""),
		goalAmount:
			row.goalAmount != null ? Number(row.goalAmount) : undefined,
		currency: String(row.currency || "USD"),
		startDate: row.startDate ? String(row.startDate) : undefined,
		endDate: row.endDate ? String(row.endDate) : undefined,
	};
}

export async function listCampaigns(orgId: string): Promise<Campaign[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.orderDesc("$createdAt"),
			Query.limit(PAGE_SIZE_MAX),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getCampaignById(
	id: string,
	orgId: string,
): Promise<Campaign | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
		});
		const campaign = mapRow(row as unknown as Record<string, unknown>);
		if (campaign.orgId !== orgId) return null;
		return campaign;
	} catch {
		return null;
	}
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			name: input.name.trim(),
			goalAmount: input.goalAmount ?? null,
			currency: (input.currency || "USD").toUpperCase(),
			startDate: input.startDate || null,
			endDate: input.endDate || null,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateCampaign(
	id: string,
	orgId: string,
	patch: UpdateCampaignInput,
): Promise<Campaign | null> {
	const existing = await getCampaignById(id, orgId);
	if (!existing) return null;
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {};
	if (patch.name != null) data.name = patch.name.trim();
	if (patch.goalAmount !== undefined) data.goalAmount = patch.goalAmount;
	if (patch.currency != null) data.currency = patch.currency.toUpperCase();
	if (patch.startDate !== undefined) data.startDate = patch.startDate;
	if (patch.endDate !== undefined) data.endDate = patch.endDate;
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: id,
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
