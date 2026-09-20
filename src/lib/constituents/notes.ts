import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { ConstituentNote, ConstituentNoteKind } from "./types";
import { isConstituentNoteKind } from "./types";

function tableId(): string {
	return appwriteConfig.constituentNotesCollectionId || "69c8e8a2001f4e8c2a11";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): ConstituentNote {
	const kind = isConstituentNoteKind(row.kind) ? row.kind : "note";
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		orgId: String(row.orgId || ""),
		constituentId: String(row.constituentId || ""),
		kind,
		body: String(row.body || ""),
		authorUserId: String(row.authorUserId || ""),
		authorName:
			typeof row.authorName === "string" && row.authorName.trim()
				? row.authorName
				: undefined,
	};
}

export async function listNotesForConstituent(
	constituentId: string,
	orgId: string,
): Promise<ConstituentNote[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("constituentId", constituentId),
			Query.orderDesc("$createdAt"),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getNoteById(id: string): Promise<ConstituentNote | null> {
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

export async function createNote(input: {
	orgId: string;
	constituentId: string;
	kind: ConstituentNoteKind;
	body: string;
	authorUserId: string;
	authorName?: string;
}): Promise<ConstituentNote> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			constituentId: input.constituentId,
			kind: input.kind,
			body: input.body.slice(0, 4000),
			authorUserId: input.authorUserId,
			authorName: input.authorName?.slice(0, 256),
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function deleteNote(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: id,
	});
}

export async function retargetNotes(input: {
	loserId: string;
	winnerId: string;
	orgId: string;
}): Promise<ConstituentNote[]> {
	const notes = await listNotesForConstituent(input.loserId, input.orgId);
	const { tablesDB } = await createAdminClient();
	const moved: ConstituentNote[] = [];
	for (const note of notes) {
		const row = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: note.$id,
			data: { constituentId: input.winnerId },
		});
		moved.push(mapRow(row as unknown as Record<string, unknown>));
	}
	return moved;
}

export async function restoreNoteTargets(
	snapshot: ConstituentNote[],
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	for (const note of snapshot) {
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: note.$id,
			data: { constituentId: note.constituentId },
		});
	}
}
