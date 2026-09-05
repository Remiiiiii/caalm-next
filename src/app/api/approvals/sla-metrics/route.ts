import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { computeSlaMetrics } from "@/lib/approvals/ApprovalSlaService";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.LICENSES.VIEW],
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	const metrics = await computeSlaMetrics(orgId || undefined);
	return NextResponse.json({ success: true, metrics });
}
