import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { listCampaigns } from "@/lib/campaigns";
import { normalizeEmail } from "@/lib/constituents/duplicates";
import { getConstituentById } from "@/lib/constituents/repository";
import { listDesignationsForOrg } from "@/lib/designations";
import {
	createDraftGift,
	GiftDomainError,
	postGift,
} from "@/lib/gifts/repository";
import type { MappedGiftImportRow } from "./parse";

export type GiftImportPlanRow =
	| {
			rowNumber: number;
			action: "create";
			constituentId: string;
			campaignId?: string;
			designationId?: string;
			contractId?: string;
			amount: number;
			giftDate: string;
			method: MappedGiftImportRow["method"];
			anonymous: boolean;
			postAfterImport: boolean;
	  }
	| { rowNumber: number; action: "skip"; reason: string }
	| { rowNumber: number; action: "error"; reason: string };

async function findConstituentId(
	orgId: string,
	row: MappedGiftImportRow,
): Promise<string | null> {
	if (row.constituentId) {
		const existing = await getConstituentById(row.constituentId);
		if (existing && existing.orgId === orgId) return existing.$id;
		return null;
	}
	const email = normalizeEmail(row.constituentEmail);
	if (!email) return null;
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: appwriteConfig.constituentsCollectionId || "69c8d4f100a8c4d1e2f0",
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("normalizedEmail", email),
			Query.limit(1),
		],
	});
	const id = result.rows[0]?.$id;
	return id ? String(id) : null;
}

async function listContractsLite(
	orgId: string,
): Promise<{ $id: string; contractNumber?: string; contractName?: string }[]> {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.contractsCollectionId || "";
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId,
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});
	return (result.rows as { $id: string; contractNumber?: string; contractName?: string }[]);
}

export async function dryRunGiftImport(
	orgId: string,
	rows: MappedGiftImportRow[],
): Promise<{
	rows: GiftImportPlanRow[];
	counts: { create: number; skip: number; error: number };
}> {
	const [campaigns, designations, contracts] = await Promise.all([
		listCampaigns(orgId),
		listDesignationsForOrg(orgId),
		listContractsLite(orgId),
	]);
	const campaignByName = new Map(
		campaigns.map((c) => [c.name.trim().toLowerCase(), c.$id]),
	);
	const designationByFund = new Map(
		designations.map((d) => [d.fundCode.trim().toUpperCase(), d.$id]),
	);
	const contractByNumber = new Map(
		contracts
			.filter((c) => c.contractNumber)
			.map((c) => [String(c.contractNumber).trim().toLowerCase(), c.$id]),
	);

	const plans: GiftImportPlanRow[] = [];
	let create = 0;
	let skip = 0;
	let error = 0;

	for (const row of rows) {
		const constituentId = await findConstituentId(orgId, row);
		if (!constituentId) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "error",
				reason: "No matching constituent in this organization",
			});
			error += 1;
			continue;
		}
		let campaignId: string | undefined;
		if (row.campaignName) {
			campaignId = campaignByName.get(row.campaignName.toLowerCase());
			if (!campaignId) {
				plans.push({
					rowNumber: row.rowNumber,
					action: "error",
					reason: `Campaign not found: ${row.campaignName}`,
				});
				error += 1;
				continue;
			}
		}
		let designationId: string | undefined;
		if (row.fundCode) {
			designationId = designationByFund.get(row.fundCode.toUpperCase());
		}
		let contractId: string | undefined;
		if (row.contractNumber) {
			contractId = contractByNumber.get(row.contractNumber.toLowerCase());
			if (!contractId) {
				plans.push({
					rowNumber: row.rowNumber,
					action: "error",
					reason: `Grant contract not found: ${row.contractNumber}`,
				});
				error += 1;
				continue;
			}
		}
		plans.push({
			rowNumber: row.rowNumber,
			action: "create",
			constituentId,
			campaignId,
			designationId,
			contractId,
			amount: row.amount,
			giftDate: row.giftDate,
			method: row.method,
			anonymous: row.anonymous,
			postAfterImport: row.postAfterImport,
		});
		create += 1;
	}

	return { rows: plans, counts: { create, skip, error } };
}

export async function commitGiftImport(
	orgId: string,
	rows: MappedGiftImportRow[],
): Promise<{ createdCount: number; skippedCount: number; failedCount: number }> {
	const dry = await dryRunGiftImport(orgId, rows);
	let createdCount = 0;
	let failedCount = 0;
	for (const plan of dry.rows) {
		if (plan.action !== "create") {
			if (plan.action === "error") failedCount += 1;
			continue;
		}
		try {
			const gift = await createDraftGift({
				orgId,
				amount: plan.amount,
				giftDate: plan.giftDate,
				method: plan.method,
				constituentId: plan.constituentId,
				campaignId: plan.campaignId,
				designationId: plan.designationId,
				contractId: plan.contractId,
				anonymous: plan.anonymous,
			});
			if (plan.postAfterImport) {
				await postGift(gift.$id, orgId);
			}
			createdCount += 1;
		} catch (error) {
			failedCount += 1;
			if (!(error instanceof GiftDomainError)) {
				console.error("[gifts import commit]", error);
			}
		}
	}
	return {
		createdCount,
		skippedCount: dry.counts.skip,
		failedCount,
	};
}
