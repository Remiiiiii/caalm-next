import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { openCursorRunStream } from "@/lib/tickets/cursor-agent.service";
import { getTicketById } from "@/lib/tickets/ticket.repository";
import { canViewTicket } from "@/lib/tickets/ticket-access.policy";

export const dynamic = "force-dynamic";

/**
 * Relays the Cursor agent's event stream to the browser so the API key stays on
 * the server. EventSource reconnects on its own and resumes via Last-Event-ID.
 */
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
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
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
	if (!ticket.cursorAgentRunId) {
		return NextResponse.json(
			{ error: "No agent for this ticket" },
			{ status: 409 },
		);
	}

	try {
		const upstream = await openCursorRunStream(ticket.cursorAgentRunId, {
			lastEventId: request.headers.get("last-event-id"),
			signal: request.signal,
		});
		if (!upstream?.ok || !upstream.body) {
			// 410 tells EventSource clients not to reconnect (the run's stream has ended).
			return NextResponse.json(
				{ error: "Agent stream unavailable" },
				{ status: upstream?.status === 410 ? 410 : 502 },
			);
		}
		return new Response(upstream.body, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
			},
		});
	} catch {
		return NextResponse.json(
			{ error: "Agent stream unavailable" },
			{ status: 502 },
		);
	}
}
