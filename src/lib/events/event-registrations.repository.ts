import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	type EventRegistration,
	type EventRegistrationStatus,
	registrationStatusConsumesCapacity,
} from "./types";
import { getTicketTypeById } from "./ticket-types.repository";

function tableId(): string {
	return (
		appwriteConfig.eventRegistrationsCollectionId || "69f2a002001f4e8c2b34"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapStatus(value: unknown): EventRegistrationStatus {
	if (
		value === "draft" ||
		value === "posted" ||
		value === "confirmed" ||
		value === "checked_in"
	) {
		return value;
	}
	return "draft";
}

function mapRow(row: Record<string, unknown>): EventRegistration {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		eventId: String(row.eventId || ""),
		ticketTypeId: String(row.ticketTypeId || ""),
		status: mapStatus(row.status),
		constituentId: row.constituentId
			? String(row.constituentId)
			: undefined,
		guestEmail: row.guestEmail ? String(row.guestEmail) : undefined,
		guestFirstName: row.guestFirstName
			? String(row.guestFirstName)
			: undefined,
		guestLastName: row.guestLastName
			? String(row.guestLastName)
			: undefined,
		amountCents: Number(row.amountCents ?? 0),
		checkedInAt: row.checkedInAt ? String(row.checkedInAt) : undefined,
		tokenUsedAt: row.tokenUsedAt ? String(row.tokenUsedAt) : undefined,
		registrationTransactionId: row.registrationTransactionId
			? String(row.registrationTransactionId)
			: undefined,
		giftId: row.giftId ? String(row.giftId) : undefined,
		confirmationEmailSentAt: row.confirmationEmailSentAt
			? String(row.confirmationEmailSentAt)
			: undefined,
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
	};
}

export async function listRegistrationsForEvent(
	orgId: string,
	eventId: string,
): Promise<EventRegistration[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("eventId", eventId),
			Query.limit(500),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getRegistrationById(
	orgId: string,
	registrationId: string,
): Promise<EventRegistration | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: registrationId,
		});
		const mapped = mapRow(row as unknown as Record<string, unknown>);
		if (mapped.orgId !== orgId) return null;
		return mapped;
	} catch {
		return null;
	}
}

/** Capacity uses posted and confirmed rows only (draft does not count). */
export async function countCapacityRegistrationsForTicketType(
	orgId: string,
	ticketTypeId: string,
): Promise<number> {
	const { tablesDB } = await createAdminClient();
	const statuses: EventRegistrationStatus[] = ["posted", "confirmed"];
	let total = 0;
	for (const status of statuses) {
		const result = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: tableId(),
			queries: [
				Query.equal("orgId", orgId),
				Query.equal("ticketTypeId", ticketTypeId),
				Query.equal("status", status),
				Query.limit(5000),
			],
		});
		total += result.total;
	}
	return total;
}

export class EventRegistrationCapacityError extends Error {
	constructor() {
		super("Ticket type is at capacity");
		this.name = "EventRegistrationCapacityError";
	}
}

export async function createEventRegistration(input: {
	orgId: string;
	eventId: string;
	ticketTypeId: string;
	status?: EventRegistrationStatus;
	constituentId?: string;
	guestEmail?: string;
	guestFirstName?: string;
	guestLastName?: string;
	amountCents?: number;
	registrationTransactionId?: string;
	giftId?: string;
}): Promise<EventRegistration> {
	const status: EventRegistrationStatus = input.status ?? "draft";
	const ticketType = await getTicketTypeById(input.orgId, input.ticketTypeId);
	if (!ticketType || ticketType.eventId !== input.eventId) {
		throw new Error("Ticket type not found");
	}

	if (registrationStatusConsumesCapacity(status)) {
		const used = await countCapacityRegistrationsForTicketType(
			input.orgId,
			input.ticketTypeId,
		);
		if (used >= ticketType.capacity) {
			throw new EventRegistrationCapacityError();
		}
	}

	if (status === "draft" && input.constituentId) {
		throw new Error("Draft registrations cannot link a constituent");
	}

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			eventId: input.eventId,
			ticketTypeId: input.ticketTypeId,
			status,
			constituentId: status === "draft" ? undefined : input.constituentId,
			guestEmail: input.guestEmail,
			guestFirstName: input.guestFirstName,
			guestLastName: input.guestLastName,
			amountCents: input.amountCents ?? ticketType.amountCents,
			registrationTransactionId: input.registrationTransactionId,
			giftId: input.giftId,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function deleteRegistration(
	orgId: string,
	registrationId: string,
): Promise<void> {
	const existing = await getRegistrationById(orgId, registrationId);
	if (!existing) return;
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: registrationId,
	});
}

export async function patchRegistration(
	orgId: string,
	registrationId: string,
	data: Record<string, unknown>,
): Promise<EventRegistration> {
	const existing = await getRegistrationById(orgId, registrationId);
	if (!existing) throw new Error("Registration not found");
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: registrationId,
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function markRegistrationCheckedIn(input: {
	orgId: string;
	registrationId: string;
	constituentId?: string;
	checkedInAt: string;
}): Promise<EventRegistration> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: input.registrationId,
		data: {
			checkedInAt: input.checkedInAt,
			tokenUsedAt: input.checkedInAt,
			...(input.constituentId ? { constituentId: input.constituentId } : {}),
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
