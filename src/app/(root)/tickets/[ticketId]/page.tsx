export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { TicketDetail } from "@/components/tickets/TicketDetail";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { canResolveTicket, canViewTicket } from "@/lib/tickets/ticket-access.policy";
import { listTicketEvents } from "@/lib/tickets/ticket-events.repository";
import { getTicketById } from "@/lib/tickets/ticket.repository";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";

export default async function TicketPage({
	params,
}: {
	params: Promise<{ ticketId: string }>;
}) {
	const user = await requirePagePermission(PERMISSIONS.TICKETS.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	const { ticketId } = await params;
	const ticket = await getTicketById(ticketId);
	if (!ticket || !canViewTicket(ticket, { userId: user.$id, permissions })) {
		notFound();
	}
	const events = await listTicketEvents(ticket.$id);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full flex-col items-start justify-start gap-1 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">Ticket</h1>
				<p className="text-sm font-semibold tracking-wide text-[#0f5384]">
					{displayTicketNumber(ticket)}
				</p>
			</div>
			<TicketDetail
				ticket={ticket}
				events={events}
				canResolve={canResolveTicket(ticket, {
					userId: user.$id,
					permissions,
				})}
			/>
		</div>
	);
}
