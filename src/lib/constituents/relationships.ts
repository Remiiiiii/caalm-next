import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getConstituentById } from "./repository";
import type { ConstituentRelationship, RelationshipType } from "./types";
import { isRelationshipType } from "./types";

function tableId(): string {
	return (
		appwriteConfig.constituentRelationshipsCollectionId ||
		"69c8e8a1001f4e8c2a10"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): ConstituentRelationship {
	const type = isRelationshipType(row.type) ? row.type : "household";
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		orgId: String(row.orgId || ""),
		fromId: String(row.fromId || ""),
		toId: String(row.toId || ""),
		type,
		softCredit: Boolean(row.softCredit),
	};
}

export function isSelfLink(fromId: string, toId: string): boolean {
	return fromId === toId;
}

/**
 * Walk existing directed edges. If `toId` can already reach `fromId`,
 * adding from→to would close a loop (A→B when B already leads back to A).
 */
export function wouldCreateCycle(
	fromId: string,
	toId: string,
	existing: Array<Pick<ConstituentRelationship, "fromId" | "toId">>,
): boolean {
	if (fromId === toId) return true;
	const outgoing = new Map<string, string[]>();
	for (const edge of existing) {
		const next = outgoing.get(edge.fromId) ?? [];
		next.push(edge.toId);
		outgoing.set(edge.fromId, next);
	}
	const seen = new Set<string>();
	const queue = [toId];
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current || seen.has(current)) continue;
		if (current === fromId) return true;
		seen.add(current);
		for (const next of outgoing.get(current) ?? []) {
			queue.push(next);
		}
	}
	return false;
}

export async function listRelationshipsForOrg(
	orgId: string,
): Promise<ConstituentRelationship[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function listRelationshipsForConstituent(
	constituentId: string,
	orgId: string,
): Promise<ConstituentRelationship[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.or([
				Query.equal("fromId", constituentId),
				Query.equal("toId", constituentId),
			]),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getRelationshipById(
	id: string,
): Promise<ConstituentRelationship | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function createRelationship(input: {
	orgId: string;
	fromId: string;
	toId: string;
	type: RelationshipType;
	softCredit?: boolean;
}): Promise<
	| { ok: true; relationship: ConstituentRelationship }
	| { ok: false; status: 400 | 404; error: string }
> {
	if (isSelfLink(input.fromId, input.toId)) {
		return { ok: false, status: 400, error: "Self-relationship is not allowed" };
	}

	const [from, to] = await Promise.all([
		getConstituentById(input.fromId),
		getConstituentById(input.toId),
	]);
	if (
		!from ||
		!to ||
		from.orgId !== input.orgId ||
		to.orgId !== input.orgId ||
		from.mergedIntoId ||
		to.mergedIntoId
	) {
		return { ok: false, status: 404, error: "Constituent not found" };
	}

	const existing = await listRelationshipsForOrg(input.orgId);
	if (wouldCreateCycle(input.fromId, input.toId, existing)) {
		return { ok: false, status: 400, error: "Circular relationship is not allowed" };
	}
	const duplicate = existing.some(
		(edge) =>
			edge.fromId === input.fromId &&
			edge.toId === input.toId &&
			edge.type === input.type,
	);
	if (duplicate) {
		return { ok: false, status: 400, error: "Relationship already exists" };
	}

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			fromId: input.fromId,
			toId: input.toId,
			type: input.type,
			softCredit: Boolean(input.softCredit),
		},
	});
	return {
		ok: true,
		relationship: mapRow(row as unknown as Record<string, unknown>),
	};
}

export async function deleteRelationship(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: id,
	});
}

export async function retargetRelationships(input: {
	loserId: string;
	winnerId: string;
	orgId: string;
}): Promise<ConstituentRelationship[]> {
	const edges = await listRelationshipsForConstituent(input.loserId, input.orgId);
	const { tablesDB } = await createAdminClient();
	const moved: ConstituentRelationship[] = [];
	for (const edge of edges) {
		const fromId = edge.fromId === input.loserId ? input.winnerId : edge.fromId;
		const toId = edge.toId === input.loserId ? input.winnerId : edge.toId;
		if (fromId === toId) {
			await tablesDB.deleteRow({
				databaseId: dbId(),
				tableId: tableId(),
				rowId: edge.$id,
			});
			continue;
		}
		const row = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: edge.$id,
			data: { fromId, toId },
		});
		moved.push(mapRow(row as unknown as Record<string, unknown>));
	}
	return moved;
}

export async function restoreRelationshipTargets(
	snapshot: ConstituentRelationship[],
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	for (const edge of snapshot) {
		try {
			await tablesDB.updateRow({
				databaseId: dbId(),
				tableId: tableId(),
				rowId: edge.$id,
				data: { fromId: edge.fromId, toId: edge.toId },
			});
		} catch {
			// Rollback best-effort if the row was deleted as a self-loop.
		}
	}
}
