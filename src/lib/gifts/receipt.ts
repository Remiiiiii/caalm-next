import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

function countersTableId(): string {
	return (
		appwriteConfig.giftReceiptCountersCollectionId || "69d91203001f4e8c2b03"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

/** Allocate the next receipt number for an org (single counter row per org). */
export async function allocateReceiptNumber(orgId: string): Promise<number> {
	const { tablesDB } = await createAdminClient();
	const tableId = countersTableId();
	const existing = await tablesDB.listRows({
		databaseId: dbId(),
		tableId,
		queries: [Query.equal("orgId", orgId), Query.limit(1)],
	});
	const row = existing.rows[0] as Record<string, unknown> | undefined;
	if (!row) {
		const nextReceiptNumber = 1;
		await tablesDB.createRow({
			databaseId: dbId(),
			tableId,
			rowId: ID.unique(),
			data: { orgId, nextReceiptNumber: 2 },
		});
		return nextReceiptNumber;
	}

	const current = Number(row.nextReceiptNumber);
	if (!Number.isFinite(current) || current < 1) {
		throw new Error("Invalid receipt counter");
	}
	await tablesDB.updateRow({
		databaseId: dbId(),
		tableId,
		rowId: String(row.$id),
		data: { nextReceiptNumber: current + 1 },
	});
	return current;
}
