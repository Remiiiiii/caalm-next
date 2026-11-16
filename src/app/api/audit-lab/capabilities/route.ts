import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveLabCapabilities } from "@/lib/audit-lab/access";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserPermissions } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.VIEW,
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	const permissions = await getUserPermissions(
		resolved.actor.userId,
		resolved.actor.orgId,
	);
	const capabilities = resolveLabCapabilities({ permissions });
	return NextResponse.json({ data: { capabilities, permissions } });
}