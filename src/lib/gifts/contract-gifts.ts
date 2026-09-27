import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { mapGiftRow } from "./repository-rows";
import type { Gift } from "./types";

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

/** Posted gifts linked to a grant contract (voids and reversing rows excluded from cash). */
export async function listPostedGiftsForContract(
	orgId: string,
	contractId: string,
): Promise<{ items: Gift[]; cashTotal: number }> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("contractId", contractId),
			Query.equal("status", "posted"),
			Query.limit(200),
		],
	});
	const items = (result.rows as unknown as Record<string, unknown>[]).map(
		mapGiftRow,
	);
	const cashTotal = items
		.filter((g) => !g.voidOfId && g.amount > 0)
		.reduce((sum, g) => sum + g.amount, 0);
	return { items, cashTotal };
}
