import * as sdk from "node-appwrite";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import CacheManager from "@/lib/services/cache-manager";

async function deleteRowsMatchingUserIds(
	tablesDB: Awaited<ReturnType<typeof createAdminClient>>["tablesDB"],
	tableId: string,
	candidateIds: string[],
): Promise<void> {
	if (!candidateIds.length) return;

	const databaseId = appwriteConfig.databaseId || "default-db";
	const userIdQuery =
		candidateIds.length === 1
			? Query.equal("userId", candidateIds[0])
			: Query.or(candidateIds.map((id) => Query.equal("userId", id)));

	const result = await tablesDB.listRows({
		databaseId,
		tableId,
		queries: [userIdQuery, Query.limit(500)],
	});

	for (const row of result.rows) {
		const rowId = String((row as { $id?: string }).$id || "");
		if (!rowId) continue;
		await tablesDB.deleteRow({
			databaseId,
			tableId,
			rowId,
		});
	}
}

async function safeDeleteRowsMatchingUserIds(
	tablesDB: Awaited<ReturnType<typeof createAdminClient>>["tablesDB"],
	tableId: string,
	candidateIds: string[],
): Promise<void> {
	try {
		await deleteRowsMatchingUserIds(tablesDB, tableId, candidateIds);
	} catch (error) {
		console.error(`[deleteUserAccount] Failed to clean ${tableId}:`, error);
	}
}

/**
 * Permanently delete a CAALM user profile, org assignments, and Auth account.
 * Plain service — safe to call from Route Handlers (not a Server Action).
 */
export async function deleteUserAccount(
	userId: string,
	orgId?: string,
): Promise<{ success: true }> {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const usersTableId = appwriteConfig.usersCollectionId || "users";

	const userDoc = await tablesDB.getRow({
		databaseId,
		tableId: usersTableId,
		rowId: userId,
	});

	const accountId = String((userDoc as { accountId?: string }).accountId || "");
	const email = String((userDoc as { email?: string }).email || "");
	const fullName = String((userDoc as { fullName?: string }).fullName || "");
	const candidateIds = [...new Set([userId, accountId].filter(Boolean))];

	const managerQuery =
		candidateIds.length === 1
			? Query.equal("managerUserId", candidateIds[0])
			: Query.or(candidateIds.map((id) => Query.equal("managerUserId", id)));

	try {
		const directReports = await tablesDB.listRows({
			databaseId,
			tableId: usersTableId,
			queries: [managerQuery, Query.limit(500)],
		});

		for (const report of directReports.rows) {
			const reportId = String((report as { $id?: string }).$id || "");
			if (!reportId) continue;
			await tablesDB.updateRow({
				databaseId,
				tableId: usersTableId,
				rowId: reportId,
				data: { managerUserId: null },
			});
		}
	} catch (error) {
		console.error("[deleteUserAccount] Failed to clear manager references:", error);
	}

	await deleteRowsMatchingUserIds(tablesDB, "user_roles", candidateIds);
	await deleteRowsMatchingUserIds(tablesDB, "user_organizations", candidateIds);

	const notificationsTableId = appwriteConfig.notificationsCollectionId;
	if (notificationsTableId) {
		await safeDeleteRowsMatchingUserIds(
			tablesDB,
			notificationsTableId,
			candidateIds,
		);
	}

	const notesTableId = appwriteConfig.notesCollectionId;
	if (notesTableId) {
		await safeDeleteRowsMatchingUserIds(tablesDB, notesTableId, candidateIds);
	}

	if (accountId && appwriteConfig.secretKey) {
		const client = new sdk.Client()
			.setEndpoint(appwriteConfig.endpointUrl)
			.setProject(appwriteConfig.projectId)
			.setKey(appwriteConfig.secretKey);
		const usersApi = new sdk.Users(client);

		try {
			await usersApi.deleteSessions(accountId);
		} catch {
			// Sessions may already be cleared
		}

		try {
			await usersApi.delete(accountId);
		} catch (authError) {
			console.error("[deleteUserAccount] Failed to delete Auth user:", authError);
		}
	}

	await tablesDB.deleteRow({
		databaseId,
		tableId: usersTableId,
		rowId: userId,
	});

	try {
		await CacheManager.invalidateUsers(email, userId, accountId, fullName);
		for (const id of candidateIds) {
			await CacheManager.invalidateRBAC(id, orgId);
		}
	} catch (error) {
		console.error("[deleteUserAccount] Cache invalidation failed:", error);
	}

	return { success: true };
}
