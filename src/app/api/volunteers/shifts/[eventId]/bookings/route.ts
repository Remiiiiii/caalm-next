import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById } from "@/lib/constituents";
import {
	bookVolunteerOnShift,
	getVolunteerShiftById,
	listBookingsForEvent,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId } = await context.params;
	const shift = await getVolunteerShiftById(ctx.orgId, eventId);
	if (!shift) {
		return NextResponse.json({ error: "Shift not found" }, { status: 404 });
	}

	try {
		const items = await listBookingsForEvent(ctx.orgId, eventId);
		return NextResponse.json({ items, shift });
	} catch (error) {
		console.error("[volunteers/shifts bookings GET]", error);
		return NextResponse.json(
			{ error: "Failed to load bookings" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId } = await context.params;
	const shift = await getVolunteerShiftById(ctx.orgId, eventId);
	if (!shift) {
		return NextResponse.json({ error: "Shift not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const constituentId = String(body.constituentId || "").trim();
		if (!constituentId) {
			return NextResponse.json(
				{ error: "constituentId is required" },
				{ status: 400 },
			);
		}
		const constituent = await getConstituentById(constituentId);
		if (!constituent || constituent.orgId !== ctx.orgId) {
			return NextResponse.json(
				{ error: "Constituent not found" },
				{ status: 404 },
			);
		}

		const booking = await bookVolunteerOnShift({
			orgId: ctx.orgId,
			eventId,
			constituentId,
			shiftCapacity: shift.shiftCapacity,
		});
		return NextResponse.json({ booking }, { status: 201 });
	} catch (error) {
		console.error("[volunteers/shifts bookings POST]", error);
		return NextResponse.json(
			{ error: "Failed to book shift" },
			{ status: 500 },
		);
	}
}
