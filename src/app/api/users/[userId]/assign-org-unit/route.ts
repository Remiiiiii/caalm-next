import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { assignUserOrgUnit } from "@/lib/org/org-units.service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.USERS.EDIT,
	});
	if (denied) return denied;

	try {
		const { userId } = await params;
		const body = await request.json();
		if (!body.orgUnitId) {
			return NextResponse.json(
				{ error: "orgUnitId is required" },
				{ status: 400 },
			);
		}
		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}
		const user = await assignUserOrgUnit({
			userId,
			orgUnitId: body.orgUnitId,
			changedBy: currentUser.$id,
			reason: body.reason,
			managerUserId: body.managerUserId,
			costCenterId: body.costCenterId,
		});
		return NextResponse.json({ success: true, data: { user } });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
