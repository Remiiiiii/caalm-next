/**
 * Usage counters for billing meters (users, departments, contracts).
 */

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

function db(): string {
	return appwriteConfig.databaseId || "default-db";
}

function orgUnitsTable(): string {
	return appwriteConfig.orgUnitsCollectionId || "org_units";
}

export async function countOrgMembers(orgId: string): Promise<number> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: db(),
		tableId: "user_organizations",
		queries: [Query.equal("orgId", orgId), Query.limit(1)],
	});
	return result.total;
}

export async function countActiveDepartments(orgId: string): Promise<number> {
	const { tablesDB } = await createAdminClient();
	try {
		const result = await tablesDB.listRows({
			databaseId: db(),
			tableId: orgUnitsTable(),
			queries: [
				Query.equal("orgId", orgId),
				Query.equal("type", "department"),
				Query.equal("active", true),
				Query.limit(1),
			],
		});
		return result.total;
	} catch (error) {
		console.error("[billing/usage] countActiveDepartments:", error);
		return 0;
	}
}

export async function countContracts(orgId: string): Promise<number | null> {
	const { tablesDB } = await createAdminClient();
	const tableId =
		appwriteConfig.filesCollectionId ||
		appwriteConfig.contractsCollectionId ||
		"files";
	try {
		const result = await tablesDB.listRows({
			databaseId: db(),
			tableId,
			queries: [Query.equal("orgId", orgId), Query.limit(1)],
		});
		return result.total;
	} catch {
		// Contracts may not always carry orgId the same way — UI can show null
		return null;
	}
}
