import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	FORM_990_MAPPING_SOURCE_TYPES,
	FORM_990_PART_IX_BUCKETS,
	type Form990ExpenseMapping,
	type Form990MappingSourceType,
	type Form990PartIxBucket,
} from "./types";

function tableId(): string {
	return (
		appwriteConfig.form990ExpenseMappingsCollectionId ||
		"69d91801001f4e8c2b14"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function isSourceType(value: unknown): value is Form990MappingSourceType {
	return (
		typeof value === "string" &&
		(FORM_990_MAPPING_SOURCE_TYPES as readonly string[]).includes(value)
	);
}

function isPartIxBucket(value: unknown): value is Form990PartIxBucket {
	return (
		typeof value === "string" &&
		(FORM_990_PART_IX_BUCKETS as readonly string[]).includes(value)
	);
}

function mapRow(row: Record<string, unknown>): Form990ExpenseMapping {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		sourceType: isSourceType(row.sourceType) ? row.sourceType : "gift",
		sourceKey: String(row.sourceKey || ""),
		partIxBucket: isPartIxBucket(row.partIxBucket)
			? row.partIxBucket
			: "program",
	};
}

export async function listForm990Mappings(
	orgId: string,
): Promise<Form990ExpenseMapping[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.orderAsc("sourceType"),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function upsertForm990Mapping(input: {
	orgId: string;
	sourceType: Form990MappingSourceType;
	sourceKey: string;
	partIxBucket: Form990PartIxBucket;
}): Promise<Form990ExpenseMapping> {
	const { tablesDB } = await createAdminClient();
	const existing = await listForm990Mappings(input.orgId);
	const match = existing.find(
		(m) =>
			m.sourceType === input.sourceType && m.sourceKey === input.sourceKey,
	);

	if (match) {
		const row = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: match.$id,
			data: {
				partIxBucket: input.partIxBucket,
			},
		});
		return mapRow(row as unknown as Record<string, unknown>);
	}

	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			sourceType: input.sourceType,
			sourceKey: input.sourceKey.trim(),
			partIxBucket: input.partIxBucket,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
