import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";
import type { License } from "@/types/licenses";

/**
 * Columns for the metrics bar, attention strip, filters and header export.
 * Every key must exist on the licenses table (expiry is `licenseExpiryDate`,
 * compliance is `compliance`, department is `division`).
 */
export const LICENSE_METRICS_COLUMNS = [
	"$id",
	"licenseName",
	"licenseNumber",
	"licenseType",
	"category",
	"product",
	"vendor",
	"status",
	"compliance",
	"cost",
	"issueDate",
	"licenseExpiryDate",
	"renewalDate",
	"autoRenew",
	"quantity",
	"availableQuantity",
	"division",
	"assignedManagers",
	"deletedAt",
] as const;

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
			excludeSoftDeletedQuery("licenses"),
			// Only real columns: Appwrite rejects the whole query if one is unknown.
			Query.select([...LICENSE_METRICS_COLUMNS]),
			Query.limit(2000),
		],
	});
	return result.rows as unknown as License[];
}
