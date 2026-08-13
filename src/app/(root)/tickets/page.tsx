export const dynamic = "force-dynamic";

import { TicketQueue } from "@/components/tickets/TicketQueue";
import { PreviousIncidents } from "@/components/tickets/PreviousIncidents";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { canViewAllTickets, filterVisibleTickets } from "@/lib/tickets/ticket-access.policy";
import { listTicketEvents } from "@/lib/tickets/ticket-events.repository";
import { listTickets } from "@/lib/tickets/ticket.repository";

export default async function TicketsPage() {
	const user = await requirePagePermission(PERMISSIONS.TICKETS.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) return null;
	const permissions = await getUserPermissions(user.$id, org.orgId);
	const ownOnly = !canViewAllTickets(permissions);
	const ctx = { userId: user.$id, permissions };

	const [active, resolved] = await Promise.all([
		listTickets({
			orgId: org.orgId,
			status: "active",
			submittedByUserId: ownOnly ? user.$id : undefined,
			limit: 50,
		}),
		listTickets({
			orgId: org.orgId,
			status: "resolved",
			submittedByUserId: ownOnly ? user.$id : undefined,
			limit: 20,
		}),
	]);

	const resolvedItems = filterVisibleTickets(resolved.items, ctx);
	const eventsByTicket: Record<string, Awaited<ReturnType<typeof listTicketEvents>>> =
		{};
	await Promise.all(
		resolvedItems.map(async (ticket) => {
			eventsByTicket[ticket.$id] = await listTicketEvents(ticket.$id);
		}),
	);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">Tickets</h1>
			</div>
			<div className="space-y-8">
				<section>
					<h2 className="mb-4 text-sm font-medium sidebar-gradient-text">
						Active
					</h2>
					<TicketQueue tickets={filterVisibleTickets(active.items, ctx)} />
				</section>
				<section>
					<h2 className="mb-4 text-sm font-medium sidebar-gradient-text">
						Previous incidents
					</h2>
					<PreviousIncidents
						tickets={resolvedItems}
						eventsByTicket={eventsByTicket}
					/>
				</section>
			</div>
		</div>
	);
}
