import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { CFCE_EVIDENCE_MAP_SEED } from "./evidence-map.seed";
import type {
	AuditEvidenceMapRow,
	AuditEvidenceSegment,
} from "./types";

function tableId(): string {
	return (
		appwriteConfig.auditEvidenceMapCollectionId || "3cfb1121431b22b684e3"
	);
}

function parseRow(row: Record<string, unknown>): AuditEvidenceMapRow {
	return {
		$id: String(row.$id),
		segment: row.segment as AuditEvidenceMapRow["segment"],
		auditType: row.auditType as AuditEvidenceMapRow["auditType"],
		requirementId: String(row.requirementId ?? ""),
		label: String(row.label ?? ""),
		evidenceType: String(row.evidenceType ?? ""),
		caalmModule: row.caalmModule as AuditEvidenceMapRow["caalmModule"],
		inV1: Boolean(row.inV1),
		notes: row.notes ? String(row.notes) : undefined,
	};
}

export async function listEvidenceMap(
	segment: AuditEvidenceSegment = "cfce_fqhc_cw",
	inV1Only = true,
): Promise<AuditEvidenceMapRow[]> {
	try {
		const { tablesDB } = await createAdminClient();
		const queries = [Query.equal("segment", segment), Query.limit(200)];
		if (inV1Only) queries.push(Query.equal("inV1", true));

		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: tableId(),
			queries,
		});

		return result.rows.map((row) =>
			parseRow(row as unknown as Record<string, unknown>),
		);
	} catch (error) {
		console.warn(
			"[SERVER] listEvidenceMap: falling back to code seed",
			error instanceof Error ? error.message : error,
		);
		return CFCE_EVIDENCE_MAP_SEED.filter(
			(row) => row.segment === segment && (!inV1Only || row.inV1),
		);
	}
}

export async function seedCfceEvidenceMap(): Promise<{
	created: number;
	skipped: number;
}> {
	const { tablesDB } = await createAdminClient();
	let created = 0;
	let skipped = 0;

	for (const item of CFCE_EVIDENCE_MAP_SEED) {
		const existing = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: tableId(),
			queries: [
				Query.equal("segment", item.segment),
				Query.equal("requirementId", item.requirementId),
				Query.limit(1),
			],
		});

		if (existing.rows.length > 0) {
			skipped += 1;
			continue;
		}

		await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: tableId(),
			rowId: ID.unique(),
			data: {
				segment: item.segment,
				auditType: item.auditType,
				requirementId: item.requirementId,
				label: item.label,
				evidenceType: item.evidenceType,
				caalmModule: item.caalmModule,
				inV1: item.inV1,
				notes: item.notes || "",
			},
		});
		created += 1;
	}

	return { created, skipped };
}
