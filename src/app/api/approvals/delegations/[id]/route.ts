import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { deleteDelegation } from "@/lib/approvals/approvalDelegations";
import { requirePermission } from "@/lib/rbac/middleware";

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		// LICENSES has no REVIEW permission; only contracts.review has ever authorised this route.
		permission: [PERMISSIONS.CONTRACTS.REVIEW],
	});
	if (denied) return denied;

	const { id } = await context.params;
	await deleteDelegation(id);
	return NextResponse.json({ success: true });
}
