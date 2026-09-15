import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getOrgExportCatalog } from "@/lib/portability/org-export-catalog";
import {
	isDeletionGraceElapsed,
	parseOrgSettings,
	readTenantDeletionSettings,
} from "@/lib/portability/tenant-deletion-notice";
import { ORGANIZATIONS_TABLE_ID } from "@/lib/portability/tenant-export.service";

export {
	buildDeletionCancelSettings,
	buildDeletionRequestSettings,
	computeDeletionScheduledAt,
	isDeletionGraceElapsed,
	parseOrgSettings,
	readTenantDeletionSettings,
	TENANT_DELETION_GRACE_DAYS,
	type TenantDeletionSettings,
} from "@/lib/portability/tenant-deletion-notice";

export async function deleteOrgScopedRows(
	orgId: string,
	options?: {
		pageSize?: number;
	},
): Promise<{ tableId: string; deleted: number; error?: string }[]> {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const pageSize = options?.pageSize ?? 50;
	const results: { tableId: string; deleted: number; error?: string }[] = [];

	for (const entry of getOrgExportCatalog()) {
		try {
			let deleted = 0;
			let hasMore = true;
			while (hasMore) {
				const batch = await tablesDB.listRows({
					databaseId,
					tableId: entry.tableId,
					queries: [Query.equal(entry.orgField, orgId), Query.limit(pageSize)],
				});
				if (batch.rows.length === 0) {
					hasMore = false;
					break;
				}
				for (const row of batch.rows) {
					await tablesDB.deleteRow({
						databaseId,
						tableId: entry.tableId,
						rowId: row.$id,
					});
					deleted += 1;
				}
				if (batch.rows.length < pageSize) hasMore = false;
			}
			results.push({ tableId: entry.tableId, deleted });
		} catch (error) {
			results.push({
				tableId: entry.tableId,
				deleted: 0,
				error: error instanceof Error ? error.message : "Delete failed",
			});
		}
	}

	return results;
}

export async function purgeTenantOrganization(orgId: string): Promise<{
	orgId: string;
	deletedTables: { tableId: string; deleted: number; error?: string }[];
	organizationDeleted: boolean;
}> {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const deletedTables = await deleteOrgScopedRows(orgId);

	let organizationDeleted = false;
	try {
		await tablesDB.deleteRow({
			databaseId,
			tableId: ORGANIZATIONS_TABLE_ID,
			rowId: orgId,
		});
		organizationDeleted = true;
	} catch {
		organizationDeleted = false;
	}

	return { orgId, deletedTables, organizationDeleted };
}

export async function listOrgsPendingTenantDeletion(now = new Date()): Promise<
	Array<{
		orgId: string;
		scheduledAt: string;
		settings: Record<string, unknown>;
	}>
> {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const pending: Array<{
		orgId: string;
		scheduledAt: string;
		settings: Record<string, unknown>;
	}> = [];

	let cursor: string | undefined;
	for (;;) {
		const queries = [Query.limit(100)];
		if (cursor) queries.push(Query.cursorAfter(cursor));
		const page = await tablesDB.listRows({
			databaseId,
			tableId: ORGANIZATIONS_TABLE_ID,
			queries,
		});
		if (!page.rows.length) break;

		for (const row of page.rows) {
			cursor = row.$id;
			const settings = parseOrgSettings(row.settings);
			const deletion = readTenantDeletionSettings(settings);
			if (
				deletion.deletionScheduledAt &&
				isDeletionGraceElapsed(deletion.deletionScheduledAt, now)
			) {
				pending.push({
					orgId: row.$id,
					scheduledAt: deletion.deletionScheduledAt,
					settings,
				});
			}
		}
		if (page.rows.length < 100) break;
	}

	return pending;
}
