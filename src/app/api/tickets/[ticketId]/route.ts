import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { canViewTicket } from "@/lib/tickets/ticket-access.policy";
import { listTicketEvents } from "@/lib/tickets/ticket-events.repository";
import { getTicketById } from "@/lib/tickets/ticket.repository";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ ticketId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.TICKETS.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	const { ticketId } = await params;
	const ticket = await getTicketById(ticketId);
	if (!ticket) {
		return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
	}
	if (!canViewTicket(ticket, { userId: user.$id, permissions })) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const events = await listTicketEvents(ticket.$id);
	return NextResponse.json({ ticket, events });
}
