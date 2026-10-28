import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { listItStaff } from "@/lib/tickets/ticket-staff";

export async function GET(request: Request) {
	// Incident owners and ticket assigners both pick from this list.
	const denied = await requirePermission(request as any, {
		permission: [PERMISSIONS.IT.MANAGE_INCIDENTS, PERMISSIONS.TICKETS.ASSIGN],
	});
	if (denied) return denied;

	return NextResponse.json(await listItStaff());
}
