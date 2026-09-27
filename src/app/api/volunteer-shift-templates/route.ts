import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createShiftTemplate,
	listShiftTemplatesForOrg,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

export async function GET(request: NextRequest) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const items = await listShiftTemplatesForOrg(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[volunteer-shift-templates GET]", error);
		return NextResponse.json(
			{ error: "Failed to load templates" },
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
		const body = await request.json();
		const name = String(body.name || "").trim();
		const roleLabel = String(body.roleLabel || "").trim();
		const durationMinutes = Number(body.durationMinutes);
		const defaultCapacity = Number(body.defaultCapacity);
		const skillsRequired = Array.isArray(body.skillsRequired)
			? body.skillsRequired.map(String)
			: [];
		if (!name || !roleLabel || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
			return NextResponse.json(
				{ error: "name, roleLabel, and durationMinutes are required" },
				{ status: 400 },
			);
		}
		if (!Number.isFinite(defaultCapacity) || defaultCapacity < 1) {
			return NextResponse.json(
				{ error: "defaultCapacity must be at least 1" },
				{ status: 400 },
			);
		}
		const item = await createShiftTemplate({
			orgId: ctx.orgId,
			name,
			roleLabel,
			durationMinutes,
			skillsRequired,
			defaultCapacity,
		});
		return NextResponse.json({ item }, { status: 201 });
	} catch (error) {
		console.error("[volunteer-shift-templates POST]", error);
		return NextResponse.json(
			{ error: "Failed to create template" },
			{ status: 500 },
		);
	}
}
