import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCalendarEventInOrg } from "@/lib/events/calendar-event-access";
import {
	listRegistrationsForEvent,
	requireEventStaffContext,
} from "@/lib/events";
import { getTicketTypeById } from "@/lib/events/ticket-types.repository";

type RouteContext = { params: Promise<{ eventId: string }> };

function csvEscape(value: string): string {
	if (/[",\n]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

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

	const lines = [
		"name,ticket_type,checked_in",
		...roster.map((row) => {
			const name =
				`${row.guestFirstName || ""} ${row.guestLastName || ""}`.trim() ||
				row.guestEmail ||
				"Guest";
			const ticket = ticketNames.get(row.ticketTypeId) || row.ticketTypeId;
			const checkedIn = row.checkedInAt ? "yes" : "no";
			return [csvEscape(name), csvEscape(ticket), checkedIn].join(",");
		}),
	];

	const body = lines.join("\n");
	return new NextResponse(body, {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="event-roster-${eventId}.csv"`,
		},
	});
}
