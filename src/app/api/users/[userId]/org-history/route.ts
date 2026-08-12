import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listOrgUnitHistory } from "@/lib/org/org-units.service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	const denied = await requirePermission(_request, {
		permission: PERMISSIONS.USERS.VIEW,
	});
	if (denied) return denied;

	try {
		const { userId } = await params;
		const history = await listOrgUnitHistory(userId);
		return NextResponse.json({ success: true, data: { history } });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}
