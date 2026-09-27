import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import {
	getVolunteerShiftById,
	promoteWaitlistBooking,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

type RouteContext = {
	params: Promise<{ eventId: string; bookingId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId, bookingId } = await context.params;
	const shift = await getVolunteerShiftById(ctx.orgId, eventId);
	if (!shift) {
		return NextResponse.json({ error: "Shift not found" }, { status: 404 });
	}

	try {
		const booking = await promoteWaitlistBooking({
			orgId: ctx.orgId,
			bookingId,
			shiftCapacity: shift.shiftCapacity,
		});
		if (!booking) {
			return NextResponse.json(
				{ error: "Booking not found or shift is full" },
				{ status: 409 },
			);
		}

		await logAuditEvent({
			event_id: `volunteer_waitlist_promote_${booking.$id}`,
			event_title: "Volunteer waitlist promotion",
			action: "update",
			source: "caalm",
			user_id: ctx.user.$id,
			user_name: ctx.user.fullName || ctx.user.email || "User",
			user_email: ctx.user.email || "",
			orgId: ctx.orgId,
			status: "success",
			module: "system",
			target_type: "volunteer_shift_booking",
			target_id: booking.$id,
			summary: `Promoted volunteer ${booking.constituentId} from waitlist for shift ${eventId}`,
			metadata: {
				eventId,
				constituentId: booking.constituentId,
			},
		});

		return NextResponse.json({ booking });
	} catch (error) {
		console.error("[volunteers/shifts promote POST]", error);
		return NextResponse.json(
			{ error: "Failed to promote booking" },
			{ status: 500 },
		);
	}
}
