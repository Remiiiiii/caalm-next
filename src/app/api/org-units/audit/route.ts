import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { auditOrgPlacement } from "@/lib/org/org-units.service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.VIEW,
	});
	if (denied) return denied;

	try {
		const orgId =
			request.nextUrl.searchParams.get("orgId") ||
			request.headers.get("x-org-id") ||
			undefined;
		const result = await auditOrgPlacement(orgId || undefined);
		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}
