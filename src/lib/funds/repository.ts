import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	DEFAULT_UNRESTRICTED_FUND_CODE,
	isNetAssetClass,
	type NetAssetClass,
} from "./constants";
import type { CreateOrgFundInput, OrgFund } from "./types";

function tableId(): string {
	return appwriteConfig.orgFundsCollectionId || "69d91701001f4e8c2b11";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): OrgFund {
	const netAssetClass = isNetAssetClass(row.netAssetClass)
		? row.netAssetClass
		: "unrestricted";
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		code: String(row.code || ""),
		name: String(row.name || ""),
		netAssetClass,
		createdAt: String(row.createdAt || row.$createdAt || ""),
	};
}

export async function listFundsForOrg(orgId: string): Promise<OrgFund[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.orderAsc("code"),
			Query.limit(100),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getFundById(
	orgId: string,
	fundId: string,
): Promise<OrgFund | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: fundId,
		});
		const fund = mapRow(row as unknown as Record<string, unknown>);
		if (fund.orgId !== orgId) return null;
		return fund;
	} catch {
		return null;
	}
}

export async function createFund(input: CreateOrgFundInput): Promise<OrgFund> {
	const { tablesDB } = await createAdminClient();
	const createdAt = new Date().toISOString();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			code: input.code.trim().toUpperCase(),
			name: input.name.trim(),
			netAssetClass: input.netAssetClass,
			createdAt,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

/** Seed a single unrestricted fund the first time finance opens Funds settings. */
export async function ensureDefaultUnrestrictedFund(
	orgId: string,
): Promise<OrgFund> {
	const existing = await listFundsForOrg(orgId);
	const found = existing.find(
		(f) => f.code === DEFAULT_UNRESTRICTED_FUND_CODE,
	);
	if (found) return found;
	return createFund({
		orgId,
		code: DEFAULT_UNRESTRICTED_FUND_CODE,
		name: "Unrestricted general fund",
		netAssetClass: "unrestricted",
	});
}

export async function assertFundInOrg(
	orgId: string,
	fundId: string,
): Promise<OrgFund> {
	const fund = await getFundById(orgId, fundId);
	if (!fund) {
		throw new Error("Fund not found in this organization");
	}
	return fund;
}

export function netAssetClassLabel(value: NetAssetClass): string {
	switch (value) {
		case "unrestricted":
			return "Unrestricted";
		case "temporarily_restricted":
			return "Temporarily restricted";
		case "permanently_restricted":
			return "Permanently restricted";
		default:
		 return value;
	}
}
