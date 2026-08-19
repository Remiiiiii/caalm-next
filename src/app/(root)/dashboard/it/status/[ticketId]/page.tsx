export const dynamic = "force-dynamic";

import { Activity } from "lucide-react";
import { notFound } from "next/navigation";
import { ITPageShell } from "@/components/it/ITPageShell";
import { TicketDetail } from "@/components/tickets/TicketDetail";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { canResolveTicket, canViewTicket } from "@/lib/tickets/ticket-access.policy";
import { listTicketEvents } from "@/lib/tickets/ticket-events.repository";
import { getTicketById } from "@/lib/tickets/ticket.repository";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";

export default async function TicketStatusDetailPage({
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
		<ITPageShell
			title="Ticket"
			subtitle={`${displayTicketNumber(ticket)} · ${ticket.title}`}
			icon={Activity}
		>
			<TicketDetail
				ticket={ticket}
				events={events}
				canResolve={canResolveTicket(ticket, {
					userId: user.$id,
					permissions,
				})}
			/>
		</ITPageShell>
	);
}
