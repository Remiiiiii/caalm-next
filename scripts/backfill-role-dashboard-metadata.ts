/**
 * Backfill `priority` and `homeDashboardPath` on Appwrite `roles` rows.
 *
 * Prerequisites: add optional integer `priority` and string `homeDashboardPath`
 * columns to the `roles` table in Appwrite (see GITHUB_SECRETS_SETUP.md).
 *
 * Run: pnpm tsx scripts/backfill-role-dashboard-metadata.ts
 */

import { createAdminClient } from "../src/lib/appwrite";
import { appwriteConfig } from "../src/lib/appwrite/config";
import { ROLE_DASHBOARD_FALLBACK } from "../src/lib/rbac/role-dashboard-metadata";

async function main() {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";

	for (const [roleId, meta] of Object.entries(ROLE_DASHBOARD_FALLBACK)) {
		try {
			await tablesDB.updateRow({
				databaseId,
				tableId: "roles",
				rowId: roleId,
				data: {
					priority: meta.priority,
					homeDashboardPath: meta.homeDashboardPath,
				},
			});
			console.log("Updated role", roleId, meta);
		} catch (e) {
			console.error("Failed to update role", roleId, e);
		}
	}
}

main().catch(console.error);
