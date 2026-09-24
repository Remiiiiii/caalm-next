import { type NextRequest, NextResponse } from "next/server";
import { createCalendarEvent } from "@/lib/actions/calendar.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { PERMISSIONS } from "@/constants/permissions";
import {
	listVolunteerShiftsForOrg,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

export async function GET(request: NextRequest) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const items = await listVolunteerShiftsForOrg(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[volunteers/shifts GET]", error);
		return NextResponse.json(
			{ error: "Failed to load shifts" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const user = await getCurrentUser();
		if (!user?.accountId) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}
		const body = await request.json();
		const title = String(body.title || "").trim();
		const startDate = String(body.startDate || "").trim();
		const shiftCapacity = Number(body.shiftCapacity);
		if (!title || !startDate) {
			return NextResponse.json(
				{ error: "title and startDate are required" },
				{ status: 400 },
			);
		}
		if (!Number.isFinite(shiftCapacity) || shiftCapacity < 1) {
			return NextResponse.json(
				{ error: "shiftCapacity must be at least 1" },
				{ status: 400 },
			);
		}

		const event = await createCalendarEvent({
			title,
			startDate,
			endDate: body.endDate ? String(body.endDate) : undefined,
			startTime: body.startTime ? String(body.startTime) : undefined,
			endTime: body.endTime ? String(body.endTime) : undefined,
			description: body.description ? String(body.description) : undefined,
			type: "volunteer_shift",
			createdBy: user.accountId,
			createdByUserId: user.$id,
			createdByAccountId: user.accountId,
			shiftCapacity,
			shiftTemplateId: body.shiftTemplateId
				? String(body.shiftTemplateId)
				: undefined,
		});

		return NextResponse.json({ item: event }, { status: 201 });
	} catch (error) {
		console.error("[volunteers/shifts POST]", error);
		return NextResponse.json(
			{ error: "Failed to create shift" },
			{ status: 500 },
		);
	}
}
