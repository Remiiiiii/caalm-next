import { ID, Query } from "node-appwrite";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	type EvidenceRecordKind,
	sanitizeRequirementIds,
} from "./evidence-map.seed";

export interface EvidenceRecordTag {
	$id: string;
	orgId: string;
	requirementId: string;
	recordId: string;
	recordKind: EvidenceRecordKind;
}

export interface TaggedRecordSummary {
	id: string;
	title: string;
	kind: EvidenceRecordKind;
	orgId: string;
	type?: string;
	category?: string;
	division?: string;
	description?: string;
	vendor?: string;
}

function tableId(): string {
	return (
		appwriteConfig.auditEvidenceRecordTagsCollectionId || "69f8e3a2001d4e8c2b10"
	);
}

function parseTag(row: Record<string, unknown>): EvidenceRecordTag {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId ?? ""),
		requirementId: String(row.requirementId ?? ""),
		recordId: String(row.recordId ?? ""),
		recordKind: row.recordKind === "license" ? "license" : "contract",
	};
}

export async function getTaggedRecord(
	kind: EvidenceRecordKind,
	recordId: string,
	orgId: string,
): Promise<TaggedRecordSummary | null> {
	if (kind === "license") {
		const license = await LicenseService.getLicenseByIdForOrg(recordId, orgId);
		if (!license) return null;
		return {
			id: String(license.$id),
			title: String(license.licenseName || "Unnamed license"),
			kind,
			orgId,
			type: license.licenseType ? String(license.licenseType) : undefined,
			category: license.category ? String(license.category) : undefined,
			division: license.division ? String(license.division) : undefined,
			description: license.notes ? String(license.notes) : undefined,
			vendor: license.vendor ? String(license.vendor) : undefined,
		};
	}

	const { tablesDB } = await createAdminClient();
	try {
		const row = (await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			rowId: recordId,
		})) as Record<string, unknown>;
		if (String(row.orgId || "") !== orgId) return null;
		return {
			id: String(row.$id),
			title: String(row.contractName || row.name || "Unnamed contract"),
			kind,
			orgId,
			type: row.contractType ? String(row.contractType) : undefined,
			division: row.division ? String(row.division) : undefined,
			description: row.description ? String(row.description) : undefined,
			vendor: row.vendor ? String(row.vendor) : undefined,
		};
	} catch {
		return null;
	}
}

export async function listTagsForRecord(
	orgId: string,
	recordId: string,
	recordKind: EvidenceRecordKind,
): Promise<EvidenceRecordTag[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("recordId", recordId),
			Query.equal("recordKind", recordKind),
			Query.limit(100),
		],
	});
	return result.rows.map((row) =>
		parseTag(row as unknown as Record<string, unknown>),
	);
}

export async function listTagsForOrg(
	orgId: string,
): Promise<EvidenceRecordTag[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});
	return result.rows.map((row) =>
		parseTag(row as unknown as Record<string, unknown>),
	);
}

export function groupRequirementIdsByRecord(
	tags: EvidenceRecordTag[],
): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const tag of tags) {
		const key = `${tag.recordKind}:${tag.recordId}`;
		const list = map.get(key) ?? [];
		list.push(tag.requirementId);
		map.set(key, list);
	}
	return map;
}

export async function replaceTagsForRecord(options: {
	orgId: string;
	recordId: string;
	recordKind: EvidenceRecordKind;
	requirementIds: string[];
}): Promise<{ added: string[]; removed: string[]; requirementIds: string[] }> {
	const nextIds = sanitizeRequirementIds(
		options.recordKind,
		options.requirementIds,
	);
	const existing = await listTagsForRecord(
		options.orgId,
		options.recordId,
		options.recordKind,
	);
	const existingIds = new Set(existing.map((tag) => tag.requirementId));
	const nextSet = new Set(nextIds);

	const removed = existing
		.filter((tag) => !nextSet.has(tag.requirementId))
		.map((tag) => tag.requirementId);
	const added = nextIds.filter((id) => !existingIds.has(id));

	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId!;
	const table = tableId();

	for (const tag of existing) {
		if (nextSet.has(tag.requirementId)) continue;
		await tablesDB.deleteRow({
			databaseId,
			tableId: table,
			rowId: tag.$id,
		});
	}

	for (const requirementId of added) {
		await tablesDB.createRow({
			databaseId,
			tableId: table,
			rowId: ID.unique(),
			data: {
				orgId: options.orgId,
				requirementId,
				recordId: options.recordId,
				recordKind: options.recordKind,
			},
		});
	}

	return { added, removed, requirementIds: nextIds };
}
