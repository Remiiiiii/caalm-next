import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { listRelationshipsForConstituent } from "@/lib/constituents/relationships";
import type { Gift } from "./types";

export type GiftSoftCredit = {
	$id: string;
	orgId: string;
	giftId: string;
	constituentId: string;
	amount: number;
	hardCreditConstituentId: string;
};

function tableId(): string {
	return appwriteConfig.giftSoftCreditsCollectionId || "69d91405001f4e8c2b08";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): GiftSoftCredit {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		giftId: String(row.giftId || ""),
		constituentId: String(row.constituentId || ""),
		amount: Number(row.amount),
		hardCreditConstituentId: String(row.hardCreditConstituentId || ""),
	};
}

/** Create soft-credit recognition rows when a gift posts (does not change receipt totals). */
export async function createSoftCreditsForPostedGift(gift: Gift): Promise<void> {
	if (gift.status !== "posted" || gift.amount <= 0) return;

	const edges = await listRelationshipsForConstituent(
		gift.constituentId,
		gift.orgId,
	);
	const partners = new Set<string>();
	for (const edge of edges) {
		if (!edge.softCredit) continue;
		const partner =
			edge.fromId === gift.constituentId ? edge.toId : edge.fromId;
		if (partner && partner !== gift.constituentId) partners.add(partner);
	}
	if (partners.size === 0) return;

	const { tablesDB } = await createAdminClient();
	for (const constituentId of partners) {
		await tablesDB.createRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: ID.unique(),
			data: {
				orgId: gift.orgId,
				giftId: gift.$id,
				constituentId,
				amount: gift.amount,
				hardCreditConstituentId: gift.constituentId,
			},
		});
	}
}

export async function listSoftCreditsForGift(
	giftId: string,
	orgId: string,
): Promise<GiftSoftCredit[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("giftId", giftId),
			Query.limit(50),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}
