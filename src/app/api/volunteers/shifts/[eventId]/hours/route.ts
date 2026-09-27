import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById } from "@/lib/constituents";
import {
	createVolunteerHourLog,
	getVolunteerShiftById,
	listHoursForShift,
	requireVolunteerOrgContext,
	sumApprovedMinutes,
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

	const items = await listHoursForShift(ctx.orgId, eventId);
	return NextResponse.json({
		items,
		approvedMinutesTotal: sumApprovedMinutes(items),
	});
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
		const volunteerConstituentId = String(
			body.volunteerConstituentId || "",
		).trim();
		const minutesWorked = Number(body.minutesWorked);
		const workedAt = String(body.workedAt || "").trim();
		if (!volunteerConstituentId || !workedAt) {
			return NextResponse.json(
				{ error: "volunteerConstituentId and workedAt are required" },
				{ status: 400 },
			);
		}
		if (!Number.isFinite(minutesWorked) || minutesWorked < 1) {
			return NextResponse.json(
				{ error: "minutesWorked must be at least 1" },
				{ status: 400 },
			);
		}

		const volunteer = await getConstituentById(volunteerConstituentId);
		if (!volunteer || volunteer.orgId !== ctx.orgId) {
			return NextResponse.json(
				{ error: "Volunteer constituent not found" },
				{ status: 404 },
			);
		}

		const hour = await createVolunteerHourLog({
			orgId: ctx.orgId,
			eventId,
			volunteerConstituentId,
			actorUserId: ctx.user.$id,
			source: "proxy",
			minutesWorked,
			workedAt,
			roleLabel: shift.title,
		});

		return NextResponse.json({ hour }, { status: 201 });
	} catch (error) {
		console.error("[volunteers/shifts hours POST]", error);
		return NextResponse.json(
			{ error: "Failed to log hours" },
			{ status: 500 },
		);
	}
}
