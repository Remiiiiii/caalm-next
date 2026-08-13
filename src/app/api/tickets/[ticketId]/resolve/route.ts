import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { resolveTicket } from "@/lib/tickets/ticket-resolve.service";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ ticketId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.TICKETS.RESOLVE, PERMISSIONS.PLATFORM.ELEVATE],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	const { ticketId } = await params;

	try {
		const ticket = await resolveTicket({
			ticketId,
			actorId: user.$id,
			permissions,
		});
		return NextResponse.json({ ticket }, { status: 202 });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Resolve failed";
		const status = message.includes("Not allowed") ? 403 : 400;
		return NextResponse.json({ error: message }, { status });
	}
}
