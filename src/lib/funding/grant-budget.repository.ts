import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import {
	GRANT_BUDGET_CATEGORIES,
	type GrantBudgetCategory,
	type GrantBudgetLine,
} from "./grant-budget.types";

function tableId(): string {
	return (
		appwriteConfig.grantBudgetLinesCollectionId || "69d91702001f4e8c2b12"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function isCategory(value: unknown): value is GrantBudgetCategory {
	return (
		typeof value === "string" &&
		(GRANT_BUDGET_CATEGORIES as readonly string[]).includes(value)
	);
}

function mapRow(row: Record<string, unknown>): GrantBudgetLine {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		contractId: String(row.contractId || ""),
		category: isCategory(row.category) ? row.category : "other",
		amount: Number(row.amount || 0),
		periodStart: String(row.periodStart || ""),
		periodEnd: String(row.periodEnd || ""),
		label: row.label ? String(row.label) : undefined,
	};
}

export async function listBudgetLinesForGrant(
	orgId: string,
	contractId: string,
): Promise<GrantBudgetLine[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("contractId", contractId),
			Query.orderAsc("periodStart"),
			Query.limit(100),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function createBudgetLine(input: {
	orgId: string;
	contractId: string;
	category: GrantBudgetCategory;
	amount: number;
	periodStart: string;
	periodEnd: string;
	label?: string;
}): Promise<GrantBudgetLine> {
	if (!isCategory(input.category)) {
		throw new Error("Invalid budget category");
	}
	if (!Number.isFinite(input.amount) || input.amount <= 0) {
		throw new Error("Budget amount must be greater than zero");
	}
	if (!input.periodStart?.trim() || !input.periodEnd?.trim()) {
		throw new Error("Budget period start and end are required");
	}

	await loadContractForOrg(input.contractId, input.orgId);

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			contractId: input.contractId,
			category: input.category,
			amount: input.amount,
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
			label: input.label?.trim() || null,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
