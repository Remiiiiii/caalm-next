import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type ConstituentWealthScreenRow = {
	$id: string;
	orgId: string;
	constituentId: string;
	capacityBand?: number;
	externalScore?: string;
	screenDate?: string;
	source?: string;
	importedByUserId: string;
	importedAt: string;
};

function tableId(): string {
	return (
		appwriteConfig.constituentWealthScreensCollectionId ||
		"69d91601001f4e8c2b10"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): ConstituentWealthScreenRow {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		constituentId: String(row.constituentId || ""),
		capacityBand:
			row.capacityBand != null ? Number(row.capacityBand) : undefined,
		externalScore: row.externalScore
			? String(row.externalScore)
			: undefined,
		screenDate: row.screenDate ? String(row.screenDate) : undefined,
		source: row.source ? String(row.source) : undefined,
		importedByUserId: String(row.importedByUserId || ""),
		importedAt: String(row.importedAt || ""),
	};
}

export async function upsertWealthScreen(input: {
	orgId: string;
	constituentId: string;
	capacityBand?: number;
	externalScore?: string;
	screenDate?: string;
	source?: string;
	importedByUserId: string;
	importedAt: string;
}): Promise<ConstituentWealthScreenRow> {
	const { tablesDB } = await createAdminClient();
	const existing = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", input.orgId),
			Query.equal("constituentId", input.constituentId),
			Query.limit(1),
		],
	});
	const data = {
		orgId: input.orgId,
		constituentId: input.constituentId,
		capacityBand: input.capacityBand ?? null,
		externalScore: input.externalScore ?? null,
		screenDate: input.screenDate ?? null,
		source: input.source ?? null,
		importedByUserId: input.importedByUserId,
		importedAt: input.importedAt,
	};
	const prior = existing.rows?.[0] as Record<string, unknown> | undefined;
	if (prior) {
		const updated = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: String(prior.$id),
			data,
		});
		return mapRow(updated as unknown as Record<string, unknown>);
	}
	const created = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data,
	});
	return mapRow(created as unknown as Record<string, unknown>);
}

export async function getLatestWealthScreen(
	orgId: string,
	constituentId: string,
): Promise<ConstituentWealthScreenRow | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("constituentId", constituentId),
			Query.orderDesc("importedAt"),
			Query.limit(1),
		],
	});
	const row = result.rows?.[0] as Record<string, unknown> | undefined;
	return row ? mapRow(row) : null;
}

export async function listWealthScreensForConstituent(
	orgId: string,
	constituentId: string,
): Promise<ConstituentWealthScreenRow[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("constituentId", constituentId),
			Query.orderDesc("importedAt"),
			Query.limit(20),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function mapCapacityByConstituent(
	orgId: string,
): Promise<Map<string, number>> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});
	const map = new Map<string, number>();
	for (const raw of result.rows as unknown as Record<string, unknown>[]) {
		const row = mapRow(raw);
		if (row.capacityBand != null && row.capacityBand > 0) {
			map.set(row.constituentId, row.capacityBand);
		}
	}
	return map;
}
