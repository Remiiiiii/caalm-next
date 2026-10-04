import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { GiveShareAttribution } from "@/lib/give/attribution";

export type GiveShareEventType = "page_view";

export type GiveShareEvent = {
	$id: string;
	$createdAt: string;
	orgId: string;
	giveSlug: string;
	shareSource?: string;
	shareMedium?: string;
	shareCampaign?: string;
	eventType: GiveShareEventType;
};

const PAGE_SIZE = 100;

function tableId(): string {
	return appwriteConfig.giveShareEventsCollectionId || "69fc2a01001f4e8c2c01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): GiveShareEvent {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		orgId: String(row.orgId || ""),
		giveSlug: String(row.giveSlug || ""),
		shareSource: row.shareSource ? String(row.shareSource) : undefined,
		shareMedium: row.shareMedium ? String(row.shareMedium) : undefined,
		shareCampaign: row.shareCampaign ? String(row.shareCampaign) : undefined,
		eventType: "page_view",
	};
}

export async function createGiveShareVisit(input: {
	orgId: string;
	giveSlug: string;
	attribution: GiveShareAttribution;
}): Promise<GiveShareEvent> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			giveSlug: input.giveSlug,
			shareSource: input.attribution.shareSource || null,
			shareMedium: input.attribution.shareMedium || null,
			shareCampaign: input.attribution.shareCampaign || null,
			eventType: "page_view" satisfies GiveShareEventType,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function listGiveShareEventsSince(
	orgId: string,
	sinceIso: string,
	maxRows = 2000,
): Promise<GiveShareEvent[]> {
	const { tablesDB } = await createAdminClient();
	const items: GiveShareEvent[] = [];
	let offset = 0;
	while (items.length < maxRows) {
		const result = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: tableId(),
			queries: [
				Query.equal("orgId", orgId),
				Query.greaterThanEqual("$createdAt", sinceIso),
				Query.orderDesc("$createdAt"),
				Query.limit(PAGE_SIZE),
				Query.offset(offset),
			],
		});
		const rows = (result.rows as unknown as Record<string, unknown>[]).map(
			mapRow,
		);
		items.push(...rows);
		if (rows.length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
	}
	return items.slice(0, maxRows);
}
