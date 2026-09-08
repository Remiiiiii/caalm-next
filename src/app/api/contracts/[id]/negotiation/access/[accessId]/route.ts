import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listAccess, revokeAccess } from "@/lib/contracts/negotiation/access.service";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string; accessId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;
	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json({ error: "Organization is required" }, { status: 400 });
	}
	const { id, accessId } = await context.params;
	try {
		await loadContractForOrg(id, orgId);
		const invites = await listAccess(id);
		if (!invites.some((row) => row.$id === accessId)) {
			return NextResponse.json({ error: "Invite not found" }, { status: 404 });
		}
		await revokeAccess(accessId);
		return NextResponse.json({ success: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to revoke invite";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
