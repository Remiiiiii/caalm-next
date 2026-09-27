import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteShiftTemplate,
	requireVolunteerOrgContext,
	updateShiftTemplate,
} from "@/lib/volunteers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	try {
		const body = await request.json();
		const item = await updateShiftTemplate(ctx.orgId, id, {
			name: body.name != null ? String(body.name) : undefined,
			roleLabel: body.roleLabel != null ? String(body.roleLabel) : undefined,
			durationMinutes:
				body.durationMinutes != null
					? Number(body.durationMinutes)
					: undefined,
			defaultCapacity:
				body.defaultCapacity != null
					? Number(body.defaultCapacity)
					: undefined,
			skillsRequired: Array.isArray(body.skillsRequired)
				? body.skillsRequired.map(String)
				: undefined,
		});
		if (!item) {
			return NextResponse.json({ error: "Template not found" }, { status: 404 });
		}
		return NextResponse.json({ item });
	} catch (error) {
		console.error("[volunteer-shift-templates PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update template" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	try {
		const ok = await deleteShiftTemplate(ctx.orgId, id);
		if (!ok) {
			return NextResponse.json({ error: "Template not found" }, { status: 404 });
		}
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[volunteer-shift-templates DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to delete template" },
			{ status: 500 },
		);
	}
}
