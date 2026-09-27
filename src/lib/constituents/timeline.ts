import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { Constituent, DerivedAgreement } from "./types";

function mentionsConstituent(
	row: Record<string, unknown>,
	constituent: Constituent,
): boolean {
	const email = constituent.email?.trim().toLowerCase();
	const name = `${constituent.firstName} ${constituent.lastName}`
		.trim()
		.toLowerCase();
	const fields = [
		row.vendor,
		row.funder,
		row.counterpartyLegalName,
		row.counterpartyContactName,
		row.counterpartyContactEmail,
	];
	return fields.some((value) => {
		if (typeof value !== "string" || !value.trim()) return false;
		const haystack = value.trim().toLowerCase();
		return Boolean(
			(email && haystack === email) || (name && haystack.includes(name)),
		);
	});
}

function toAgreement(row: Record<string, unknown>): DerivedAgreement {
	const type = String(row.contractType || row.type || "").toLowerCase();
	const kind = type === "grant" || type.includes("grant") ? "grant" : "contract";
	const name = String(row.name || row.title || "Agreement");
	return {
		$id: String(row.$id),
		name,
		kind,
		href: `/documents/${row.$id}`,
	};
}

/**
 * Contract/grant rows are read from existing vendor/funder fields.
 * This never copies an agreement into a second table.
 */
export async function listDerivedAgreements(
	constituent: Constituent,
): Promise<DerivedAgreement[]> {
	const tableId =
		appwriteConfig.filesCollectionId || appwriteConfig.contractsCollectionId;
	if (!tableId || !appwriteConfig.databaseId) return [];

	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId,
			queries: [
				Query.equal("orgId", constituent.orgId),
				Query.limit(100),
			],
		});
		return (result.rows as unknown as Record<string, unknown>[])
			.filter((row) => mentionsConstituent(row, constituent))
			.map(toAgreement);
	} catch {
		return [];
	}
}

/** Gifts land in section 2; keep the count hook so merge preview stays honest. */
export async function countGiftsForConstituent(
	_constituentId: string,
	_orgId: string,
): Promise<number> {
	return 0;
}
