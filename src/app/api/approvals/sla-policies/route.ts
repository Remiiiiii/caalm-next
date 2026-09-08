import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createSlaPolicy,
	listSlaPolicies,
} from "@/lib/approvals/ApprovalSlaService";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.VIEW,
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const policies = await listSlaPolicies(orgId);
	return NextResponse.json({ success: true, policies });
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const body = (await request.json()) as Record<string, unknown>;
	const policy = await createSlaPolicy({
		orgId,
		entityType: (body.entityType as "contract" | "license" | "both") || "both",
		stepKind: body.stepKind as
			| "department_review"
			| "internal_approval"
			| "executive_approval"
			| "awaiting_executive",
		durationHours: Number(body.durationHours || 120),
		atRiskPercent: Number(body.atRiskPercent ?? 50),
		dueSoonHours: Number(body.dueSoonHours ?? 24),
		repeatEscalationHours: Number(body.repeatEscalationHours ?? 48),
		escalateToRoleNames: Array.isArray(body.escalateToRoleNames)
			? (body.escalateToRoleNames as string[])
			: ["Department Manager", "Organization Admin"],
		channels: Array.isArray(body.channels)
			? (body.channels as string[])
			: ["in_app", "email"],
		isActive: body.isActive !== false,
	});

	return NextResponse.json({ success: true, policy });
}
