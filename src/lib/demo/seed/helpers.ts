import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export function isoDateOffset(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().split("T")[0];
}

export function isoDateTimeOffset(days: number, hour = 10): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
}

export function getDbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

export async function countRowsByOrg(
	tableId: string,
	orgId: string,
): Promise<number> {
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: getDbId(),
			tableId,
			queries: [Query.equal("orgId", orgId), Query.limit(1)],
		});
		return result.total ?? 0;
	} catch {
		return 0;
	}
}

export async function countUsersByOrg(orgId: string): Promise<number> {
	return countRowsByOrg(appwriteConfig.usersCollectionId || "users", orgId);
}

/**
 * Create a row with a deterministic id. Skips if the row already exists.
 * Returns the row id, or null on failure.
 */
export async function createRowIfMissing(
	tableId: string,
	rowId: string,
	data: Record<string, unknown>,
	label: string,
): Promise<string | null> {
	const { tablesDB } = await createAdminClient();
	const db = getDbId();

	try {
		await tablesDB.getRow({
			databaseId: db,
			tableId,
			rowId,
		});
		return rowId;
	} catch {
		// Not found — create
	}

	try {
		await tablesDB.createRow({
			databaseId: db,
			tableId,
			rowId,
			data,
		});
		return rowId;
	} catch (error) {
		console.error(`[seedDemoOrgData] ${label} seed failed:`, error);
		return null;
	}
}

export async function safeCreateRow(
	tableId: string,
	rowId: string,
	data: Record<string, unknown>,
	label: string,
): Promise<string | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.createRow({
			databaseId: getDbId(),
			tableId,
			rowId,
			data,
		});
		return row.$id;
	} catch (error) {
		console.error(`[seedDemoOrgData] ${label} seed failed:`, error);
		return null;
	}
}

export async function tableHasColumns(tableId: string): Promise<boolean> {
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listColumns({
			databaseId: getDbId(),
			tableId,
		});
		return (result.total ?? result.columns?.length ?? 0) > 0;
	} catch {
		return false;
	}
}
