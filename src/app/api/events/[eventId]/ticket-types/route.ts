import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createTicketType,
	listTicketTypesForEvent,
	requireEventStaffContext,
} from "@/lib/events";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireEventStaffContext(
		request,
		PERMISSIONS.EVENTS.INVITE,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId } = await context.params;
	try {
		const items = await listTicketTypesForEvent(ctx.orgId, eventId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[events/ticket-types GET]", error);
		return NextResponse.json(
			{ error: "Failed to load ticket types" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireEventStaffContext(
		request,
		PERMISSIONS.EVENTS.INVITE,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId } = await context.params;
	try {
		const body = await request.json();
		const name = String(body.name || "").trim();
		const capacity = Number(body.capacity);
		const amountCents = body.amountCents != null ? Number(body.amountCents) : 0;
		if (!name) {
			return NextResponse.json({ error: "name is required" }, { status: 400 });
		}
		if (!Number.isFinite(capacity) || capacity < 1) {
			return NextResponse.json(
				{ error: "capacity must be at least 1" },
				{ status: 400 },
			);
		}

		const ticketType = await createTicketType({
			orgId: ctx.orgId,
			eventId,
			name,
			capacity,
			amountCents,
		});
		return NextResponse.json({ ticketType }, { status: 201 });
	} catch (error) {
		console.error("[events/ticket-types POST]", error);
		return NextResponse.json(
			{ error: "Failed to create ticket type" },
			{ status: 500 },
		);
	}
}
