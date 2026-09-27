import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { EventTicketType } from "./types";

function tableId(): string {
	return (
		appwriteConfig.eventTicketTypesCollectionId || "69f2a001001f4e8c2b33"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): EventTicketType {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		eventId: String(row.eventId || ""),
		name: String(row.name || ""),
		capacity: Number(row.capacity ?? 0),
		amountCents: Number(row.amountCents ?? 0),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
	};
}

export async function listTicketTypesForEvent(
	orgId: string,
	eventId: string,
): Promise<EventTicketType[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("eventId", eventId),
			Query.limit(100),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getTicketTypeById(
	orgId: string,
	ticketTypeId: string,
): Promise<EventTicketType | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: ticketTypeId,
		});
		const mapped = mapRow(row as unknown as Record<string, unknown>);
		if (mapped.orgId !== orgId) return null;
		return mapped;
	} catch {
		return null;
	}
}

export async function createTicketType(input: {
	orgId: string;
	eventId: string;
	name: string;
	capacity: number;
	amountCents?: number;
}): Promise<EventTicketType> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			eventId: input.eventId,
			name: input.name,
			capacity: input.capacity,
			amountCents: input.amountCents ?? 0,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
