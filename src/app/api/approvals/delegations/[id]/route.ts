import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { deleteDelegation } from "@/lib/approvals/approvalDelegations";
import { requirePermission } from "@/lib/rbac/middleware";

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.REVIEW, PERMISSIONS.LICENSES.REVIEW],
	});
	if (denied) return denied;

	const { id } = await context.params;
	await deleteDelegation(id);
	return NextResponse.json({ success: true });
}
