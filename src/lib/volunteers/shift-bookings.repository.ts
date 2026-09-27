import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { VolunteerShiftBooking, VolunteerShiftBookingStatus } from "./types";

function tableId(): string {
	return (
		appwriteConfig.volunteerShiftBookingsCollectionId ||
		"69d92302001f4e8c2b24"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): VolunteerShiftBooking {
	const status =
		row.status === "waitlist" || row.status === "confirmed"
			? row.status
			: "confirmed";
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		eventId: String(row.eventId || ""),
		constituentId: String(row.constituentId || ""),
		status,
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
	};
}

export async function listBookingsForEvent(
	orgId: string,
	eventId: string,
): Promise<VolunteerShiftBooking[]> {
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

export async function countConfirmedBookings(
	orgId: string,
	eventId: string,
): Promise<number> {
	const bookings = await listBookingsForEvent(orgId, eventId);
	return bookings.filter((b) => b.status === "confirmed").length;
}

export async function findBookingForConstituent(
	orgId: string,
	eventId: string,
	constituentId: string,
): Promise<VolunteerShiftBooking | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("eventId", eventId),
			Query.equal("constituentId", constituentId),
			Query.limit(1),
		],
	});
	const row = result.rows[0] as Record<string, unknown> | undefined;
	return row ? mapRow(row) : null;
}

/**
 * Book a volunteer on a shift. At capacity, status is waitlist (not a second confirmed seat).
 */
export async function bookVolunteerOnShift(input: {
	orgId: string;
	eventId: string;
	constituentId: string;
	shiftCapacity: number;
}): Promise<VolunteerShiftBooking> {
	const existing = await findBookingForConstituent(
		input.orgId,
		input.eventId,
		input.constituentId,
	);
	if (existing) return existing;

	const confirmed = await countConfirmedBookings(input.orgId, input.eventId);
	const status: VolunteerShiftBookingStatus =
		confirmed < input.shiftCapacity ? "confirmed" : "waitlist";

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			eventId: input.eventId,
			constituentId: input.constituentId,
			status,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function getBookingById(
	orgId: string,
	bookingId: string,
): Promise<VolunteerShiftBooking | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: bookingId,
		});
		const mapped = mapRow(row as unknown as Record<string, unknown>);
		if (mapped.orgId !== orgId) return null;
		return mapped;
	} catch {
		return null;
	}
}

export async function promoteWaitlistBooking(input: {
	orgId: string;
	bookingId: string;
	shiftCapacity: number;
}): Promise<VolunteerShiftBooking | null> {
	const booking = await getBookingById(input.orgId, input.bookingId);
	if (!booking || booking.status !== "waitlist") return null;

	const confirmed = await countConfirmedBookings(input.orgId, booking.eventId);
	if (confirmed >= input.shiftCapacity) return null;

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: booking.$id,
		data: { status: "confirmed" },
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
