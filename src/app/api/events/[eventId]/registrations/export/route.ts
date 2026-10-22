import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	listRegistrationsForEvent,
	requireEventStaffContext,
} from "@/lib/events";
import { getCalendarEventInOrg } from "@/lib/events/calendar-event-access";
import { getTicketTypeById } from "@/lib/events/ticket-types.repository";
import { xlsxResponse } from "@/lib/export/xlsx-response";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireEventStaffContext(
		request,
		PERMISSIONS.EVENTS.INVITE,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId } = await context.params;
	const event = await getCalendarEventInOrg(ctx.orgId, eventId);
	if (!event) {
		return NextResponse.json({ error: "Event not found" }, { status: 404 });
	}

	const registrations = await listRegistrationsForEvent(ctx.orgId, eventId);
	const roster = registrations.filter(
		(row) =>
			row.status === "posted" ||
			row.status === "confirmed" ||
			row.status === "checked_in" ||
			Boolean(row.checkedInAt),
	);

	const ticketNames = new Map<string, string>();
	for (const row of roster) {
		if (!ticketNames.has(row.ticketTypeId)) {
			const ticket = await getTicketTypeById(ctx.orgId, row.ticketTypeId);
			ticketNames.set(row.ticketTypeId, ticket?.name || row.ticketTypeId);
		}
	}

	return xlsxResponse(`event-roster-${eventId}.xlsx`, {
		sheetName: "Roster",
		title: `Event Roster — ${event.title ?? eventId}`,
		subtitle: `CAALM · ${roster.length} guest${roster.length === 1 ? "" : "s"} · Generated ${new Date().toISOString().slice(0, 10)}`,
		columns: [
			{ header: "Name", width: 36 },
			{ header: "Ticket type", width: 26 },
			{ header: "Checked in", type: "status", width: 16 },
		],
		isPositiveStatus: (v) => v === "Yes",
		rows: roster.map((row) => [
			`${row.guestFirstName || ""} ${row.guestLastName || ""}`.trim() ||
				row.guestEmail ||
				"Guest",
			ticketNames.get(row.ticketTypeId) || row.ticketTypeId,
			row.checkedInAt ? "Yes" : "No",
		]),
	});
}
