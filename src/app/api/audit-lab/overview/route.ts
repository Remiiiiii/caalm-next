import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveLabCapabilities } from "@/lib/audit-lab/access";
import { buildLabOverview } from "@/lib/audit-lab/overview";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserPermissions } from "@/lib/rbac/permissions";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.VIEW,
	});
	if (denied) return denied;

	try {
		const resolved = await resolveAuditLabActor();
		if (!resolved.ok) {
			return NextResponse.json(
				{ error: resolved.error },
				{ status: resolved.status ?? 401 },
			);
		}
		const { actor } = resolved;
		const permissions = await getUserPermissions(actor.userId, actor.orgId);
		const caps = resolveLabCapabilities({ permissions });
		const data = await buildLabOverview(actor.orgId, caps.scope);
		return NextResponse.json({ data });
	} catch (error) {
		console.error("[SERVER] GET /api/audit-lab/overview", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not load Audit Lab overview. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}