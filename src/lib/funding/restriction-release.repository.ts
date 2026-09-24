import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getGrantFundIdForContract } from "@/lib/funding/grant-fund.repository";
import {
	DEFAULT_UNRESTRICTED_FUND_CODE,
	type NetAssetClass,
} from "@/lib/funds/constants";
import { getFundById, listFundsForOrg } from "@/lib/funds/repository";

export type RestrictionRelease = {
	$id: string;
	orgId: string;
	contractId: string;
	amount: number;
	fundFrom: string;
	fundTo: string;
	releasedAt: string;
	createdByUserId: string;
	createdByName?: string;
	note?: string;
};

export class RestrictionReleaseError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

function tableId(): string {
	return (
		appwriteConfig.restrictionReleasesCollectionId || "69d91802001f4e8c2b15"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): RestrictionRelease {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		contractId: String(row.contractId || ""),
		amount: Number(row.amount || 0),
		fundFrom: String(row.fundFrom || ""),
		fundTo: String(row.fundTo || ""),
		releasedAt: String(row.releasedAt || row.$createdAt || ""),
		createdByUserId: String(row.createdByUserId || ""),
		createdByName: row.createdByName ? String(row.createdByName) : undefined,
		note: row.note ? String(row.note) : undefined,
	};
}

export async function listRestrictionReleases(
	orgId: string,
	contractId: string,
): Promise<RestrictionRelease[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("contractId", contractId),
			Query.orderDesc("releasedAt"),
			Query.limit(100),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

async function sumRestrictedGiftReceipts(
	orgId: string,
	contractId: string,
): Promise<number> {
	const { tablesDB } = await createAdminClient();
	const giftResult = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: appwriteConfig.giftsCollectionId || "test-gifts",
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("contractId", contractId),
			Query.equal("status", "posted"),
			Query.limit(5000),
		],
	});
	let total = 0;
	for (const row of giftResult.rows as unknown as Record<string, unknown>[]) {
		if (row.voidOfId) continue;
		total += Number(row.amount || 0);
	}
	return total;
}

export async function computeRemainingRestrictedBalance(input: {
	orgId: string;
	contractId: string;
}): Promise<number> {
	const fundId = await getGrantFundIdForContract(
		input.orgId,
		input.contractId,
	);
	if (!fundId) return 0;
	const fund = await getFundById(input.orgId, fundId);
	if (!fund) return 0;
	if (fund.netAssetClass === "unrestricted") return 0;

	const receipts = await sumRestrictedGiftReceipts(
		input.orgId,
		input.contractId,
	);
	const releases = await listRestrictionReleases(input.orgId, input.contractId);
	const released = releases.reduce((sum, r) => sum + r.amount, 0);
	return Math.max(0, Math.round((receipts - released) * 100) / 100);
}

async function resolveUnrestrictedFundId(orgId: string): Promise<string> {
	const funds = await listFundsForOrg(orgId);
	const found = funds.find((f) => f.code === DEFAULT_UNRESTRICTED_FUND_CODE);
	if (!found) {
		throw new RestrictionReleaseError(
			"Unrestricted fund is not set up for this organization",
			400,
		);
	}
	return found.$id;
}

export async function createRestrictionRelease(input: {
	orgId: string;
	contractId: string;
	amount: number;
	createdByUserId: string;
	createdByName?: string;
	note?: string;
}): Promise<RestrictionRelease> {
	if (!Number.isFinite(input.amount) || input.amount <= 0) {
		throw new RestrictionReleaseError("Release amount must be greater than zero");
	}

	const fundFrom = await getGrantFundIdForContract(
		input.orgId,
		input.contractId,
	);
	if (!fundFrom) {
		throw new RestrictionReleaseError(
			"Assign a restricted fund to this grant before recording a release",
		);
	}
	const fromFund = await getFundById(input.orgId, fundFrom);
	const restrictedClass: NetAssetClass[] = [
		"temporarily_restricted",
		"permanently_restricted",
	];
	if (!fromFund || !restrictedClass.includes(fromFund.netAssetClass)) {
		throw new RestrictionReleaseError(
			"Restriction release applies to temporarily or permanently restricted grant funds only",
		);
	}

	const remaining = await computeRemainingRestrictedBalance({
		orgId: input.orgId,
		contractId: input.contractId,
	});
	if (input.amount > remaining + 0.001) {
		throw new RestrictionReleaseError(
			`Release exceeds remaining restricted balance (${remaining.toFixed(2)})`,
		);
	}

	const fundTo = await resolveUnrestrictedFundId(input.orgId);
	const releasedAt = new Date().toISOString();

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			contractId: input.contractId,
			amount: input.amount,
			fundFrom,
			fundTo,
			releasedAt,
			createdByUserId: input.createdByUserId,
			createdByName: input.createdByName?.trim() || undefined,
			note: input.note?.trim() || undefined,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
