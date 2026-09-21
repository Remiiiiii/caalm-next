import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getConstituentById } from "@/lib/constituents/repository";
import { getCampaignById } from "@/lib/campaigns/repository";
import {
	DesignationDomainError,
	resolveFundForGift,
	UNRESTRICTED_FUND_CODE,
} from "@/lib/designations";
import { allocateReceiptNumber } from "./receipt";
import { assertGrantContractForOrg } from "./grant-contract";
import { mapGiftRow } from "./repository-rows";
import { createSoftCreditsForPostedGift } from "./soft-credits";
import type {
	CreateGiftInput,
	Gift,
	GiftListFilters,
	GiftMethod,
	GiftStatus,
	UpdateDraftGiftInput,
} from "./types";
import { isGiftMethod } from "./types";

const PAGE_SIZE_MAX = 100;
function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

const mapRow = mapGiftRow;

async function assertConstituentInOrg(
	constituentId: string,
	orgId: string,
): Promise<void> {
	const constituent = await getConstituentById(constituentId);
	if (!constituent || constituent.orgId !== orgId) {
		throw new GiftDomainError("Constituent not found", 404);
	}
}

async function assertCampaignInOrg(
	campaignId: string | undefined,
	orgId: string,
): Promise<void> {
	if (!campaignId) return;
	const campaign = await getCampaignById(campaignId, orgId);
	if (!campaign || campaign.orgId !== orgId) {
		throw new GiftDomainError("Campaign not found", 404);
	}
}

async function assertContractForGift(
	contractId: string | undefined,
	orgId: string,
): Promise<void> {
	if (!contractId) return;
	await assertGrantContractForOrg(contractId, orgId);
}

export class GiftDomainError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

export async function listGifts(
	filters: GiftListFilters,
): Promise<{ items: Gift[]; total: number }> {
	const { tablesDB } = await createAdminClient();
	const limit = Math.min(filters.limit ?? 20, PAGE_SIZE_MAX);
	const offset = Math.max(filters.offset ?? 0, 0);
	const queries = [
		Query.equal("orgId", filters.orgId),
		Query.orderDesc("giftDate"),
		Query.limit(limit),
		Query.offset(offset),
	];
	if (filters.status) queries.push(Query.equal("status", filters.status));
	if (filters.campaignId) {
		queries.push(Query.equal("campaignId", filters.campaignId));
	}
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries,
	});
	let items = (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
	if (filters.search?.trim()) {
		const q = filters.search.trim().toLowerCase();
		items = items.filter(
			(g) =>
				String(g.receiptNumber ?? "").includes(q) ||
				g.$id.toLowerCase().includes(q),
		);
	}
	return { items, total: result.total ?? items.length };
}

export async function getGiftById(
	id: string,
	orgId: string,
): Promise<Gift | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: giftsTableId(),
			rowId: id,
		});
		const gift = mapRow(row as unknown as Record<string, unknown>);
		if (gift.orgId !== orgId) return null;
		return gift;
	} catch {
		return null;
	}
}

export async function createDraftGift(input: CreateGiftInput): Promise<Gift> {
	await assertConstituentInOrg(input.constituentId, input.orgId);
	await assertCampaignInOrg(input.campaignId, input.orgId);
	await assertContractForGift(input.contractId, input.orgId);
	let fundCode = UNRESTRICTED_FUND_CODE;
	try {
		const resolved = await resolveFundForGift(
			input.orgId,
			input.designationId,
		);
		fundCode = resolved.fundCode;
	} catch (error) {
		if (error instanceof DesignationDomainError) {
			throw new GiftDomainError(error.message, error.status);
		}
		throw error;
	}
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: giftsTableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			amount: input.amount,
			currency: (input.currency || "USD").toUpperCase(),
			giftDate: input.giftDate,
			method: input.method,
			status: "draft" satisfies GiftStatus,
			constituentId: input.constituentId,
			campaignId: input.campaignId || null,
			designationId: input.designationId || null,
			fundCode,
			contractId: input.contractId || null,
			receiptNumber: null,
			anonymous: input.anonymous ?? false,
			voidOfId: null,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateDraftGift(
	id: string,
	orgId: string,
	patch: UpdateDraftGiftInput,
): Promise<Gift> {
	const existing = await getGiftById(id, orgId);
	if (!existing) throw new GiftDomainError("Gift not found", 404);
	if (existing.status !== "draft") {
		throw new GiftDomainError("Only draft gifts can be edited", 409);
	}
	if (patch.constituentId) {
		await assertConstituentInOrg(patch.constituentId, orgId);
	}
	const nextCampaign =
		patch.campaignId === null ? undefined : patch.campaignId ?? existing.campaignId;
	await assertCampaignInOrg(nextCampaign, orgId);
	const nextContract =
		patch.contractId === null ? undefined : patch.contractId ?? existing.contractId;
	await assertContractForGift(nextContract, orgId);

	const nextDesignation =
		patch.designationId === null
			? undefined
			: patch.designationId ?? existing.designationId;
	let fundCode = existing.fundCode;
	if (patch.designationId !== undefined) {
		try {
			const resolved = await resolveFundForGift(orgId, nextDesignation);
			fundCode = resolved.fundCode;
		} catch (error) {
			if (error instanceof DesignationDomainError) {
				throw new GiftDomainError(error.message, error.status);
			}
			throw error;
		}
	}

	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {};
	if (patch.amount != null) data.amount = patch.amount;
	if (patch.currency != null) data.currency = patch.currency.toUpperCase();
	if (patch.giftDate != null) data.giftDate = patch.giftDate;
	if (patch.method != null) data.method = patch.method;
	if (patch.constituentId != null) data.constituentId = patch.constituentId;
	if (patch.campaignId !== undefined) data.campaignId = patch.campaignId;
	if (patch.designationId !== undefined) {
		data.designationId = patch.designationId;
		data.fundCode = fundCode;
	}
	if (patch.contractId !== undefined) data.contractId = patch.contractId;
	if (patch.anonymous != null) data.anonymous = patch.anonymous;

	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: giftsTableId(),
		rowId: id,
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function postGift(id: string, orgId: string): Promise<Gift> {
	const existing = await getGiftById(id, orgId);
	if (!existing) throw new GiftDomainError("Gift not found", 404);
	if (existing.status !== "draft") {
		throw new GiftDomainError("Only draft gifts can be posted", 409);
	}
	const receiptNumber = await allocateReceiptNumber(orgId);
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: giftsTableId(),
		rowId: id,
		data: { status: "posted", receiptNumber },
	});
	const posted = mapRow(row as unknown as Record<string, unknown>);
	await createSoftCreditsForPostedGift(posted);
	return posted;
}

export async function voidPostedGift(id: string, orgId: string): Promise<Gift> {
	const existing = await getGiftById(id, orgId);
	if (!existing) throw new GiftDomainError("Gift not found", 404);
	if (existing.status !== "posted") {
		throw new GiftDomainError("Only posted gifts can be voided", 409);
	}
	if (existing.voidOfId) {
		throw new GiftDomainError("Reversing rows cannot be voided again", 409);
	}

	const receiptNumber = await allocateReceiptNumber(orgId);
	const { tablesDB } = await createAdminClient();
	await tablesDB.createRow({
		databaseId: dbId(),
		tableId: giftsTableId(),
		rowId: ID.unique(),
		data: {
			orgId,
			amount: -Math.abs(existing.amount),
			currency: existing.currency,
			giftDate: new Date().toISOString(),
			method: existing.method,
			status: "posted",
			constituentId: existing.constituentId,
			campaignId: existing.campaignId || null,
			designationId: existing.designationId || null,
			fundCode: existing.fundCode,
			contractId: existing.contractId || null,
			receiptNumber,
			anonymous: existing.anonymous,
			voidOfId: existing.$id,
		},
	});
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: giftsTableId(),
		rowId: id,
		data: { status: "voided" },
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

/** Sum posted, non-voided, non-reversing gift amounts for a campaign. */
export async function sumPostedGiftTotalForCampaign(
	orgId: string,
	campaignId: string,
): Promise<number> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("campaignId", campaignId),
			Query.equal("status", "posted"),
			Query.limit(PAGE_SIZE_MAX),
		],
	});
	const rows = (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
	return rows
		.filter((g) => !g.voidOfId && g.amount > 0)
		.reduce((sum, g) => sum + g.amount, 0);
}

export function parseGiftMethodParam(value: string | null): GiftMethod | undefined {
	if (!value) return undefined;
	return isGiftMethod(value) ? value : undefined;
}
