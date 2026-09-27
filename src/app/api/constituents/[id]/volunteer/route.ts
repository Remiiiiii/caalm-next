import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById, updateConstituent } from "@/lib/constituents";
import { authorize } from "@/lib/rbac/authorize";
import { requireVolunteerOrgContext } from "@/lib/volunteers";

type RouteContext = { params: Promise<{ id: string }> };

function isVolunteerType(type: string): boolean {
	return type === "volunteer" || type === "member";
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}
	if (!isVolunteerType(existing.type)) {
		return NextResponse.json({ profile: null });
	}

	const manageDecision = await authorize({
		userId: ctx.user.$id,
		orgId: ctx.orgId,
		permission: PERMISSIONS.VOLUNTEERS.MANAGE,
	});
	const canManage = manageDecision.allowed;

	return NextResponse.json({
		profile: {
			skills: existing.volunteerSkills ?? "",
			availability: existing.volunteerAvailability ?? "",
			emergencyContact: existing.volunteerEmergencyContact ?? "",
			...(canManage
				? { backgroundCheckDate: existing.volunteerBackgroundCheckDate ?? null }
				: {}),
		},
	});
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const patch: Record<string, unknown> = {};
		if (body.skills != null) patch.volunteerSkills = String(body.skills);
		if (body.availability != null)
			patch.volunteerAvailability = String(body.availability);
		if (body.emergencyContact != null)
			patch.volunteerEmergencyContact = String(body.emergencyContact);
		if (body.backgroundCheckDate != null) {
			const raw = String(body.backgroundCheckDate).trim();
			patch.volunteerBackgroundCheckDate = raw.length ? raw : null;
		}

		const constituent = await updateConstituent(id, patch);
		return NextResponse.json({
			profile: {
				skills: constituent.volunteerSkills ?? "",
				availability: constituent.volunteerAvailability ?? "",
				emergencyContact: constituent.volunteerEmergencyContact ?? "",
				backgroundCheckDate: constituent.volunteerBackgroundCheckDate ?? null,
			},
		});
	} catch (error) {
		console.error("[constituents volunteer PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update volunteer profile" },
			{ status: 500 },
		);
	}
}
