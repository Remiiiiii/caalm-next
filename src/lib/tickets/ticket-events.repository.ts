import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { TicketEvent, TicketEventType } from "./ticket.types";

function eventsTable(): string {
	return appwriteConfig.ticketEventsCollectionId || "ticket_events";
}

function dbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

export async function appendTicketEvent(input: {
	ticketId: string;
	eventType: TicketEventType;
	actor: string;
	metadata?: Record<string, unknown>;
}): Promise<TicketEvent> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: eventsTable(),
		rowId: ID.unique(),
		data: {
			ticketId: input.ticketId,
			eventType: input.eventType,
			actor: input.actor,
			timestamp: new Date().toISOString(),
			metadata: input.metadata ? JSON.stringify(input.metadata) : null,
		},
	});
	return row as unknown as TicketEvent;
}

export async function listTicketEvents(
	ticketId: string,
): Promise<TicketEvent[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: eventsTable(),
		queries: [
			Query.equal("ticketId", ticketId),
			Query.orderAsc("timestamp"),
			Query.limit(200),
		],
	});
	return result.rows as unknown as TicketEvent[];
}
