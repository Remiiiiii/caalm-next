import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { License } from "@/types/licenses";

/** Slim license rows for metrics, filters, and attention strips (no heavy fields). */
export async function fetchLicenseMetricsRows(
	orgId: string,
): Promise<License[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: appwriteConfig.licensesCollectionId || "licenses",
		queries: [
			Query.equal("orgId", orgId),
			Query.select([
				"$id",
				"status",
				"cost",
				"licenseExpiryDate",
				"expirationDate",
				"renewalDate",
				"autoRenew",
				"quantity",
				"availableQuantity",
				"complianceStatus",
				"division",
				"department",
				"assignedManagers",
			]),
			Query.limit(2000),
		],
	});
	return result.rows as unknown as License[];
}
