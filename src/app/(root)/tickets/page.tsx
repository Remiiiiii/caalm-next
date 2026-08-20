export const dynamic = "force-dynamic";

import { TicketsListWithSearch } from "@/components/tickets/TicketsListWithSearch";
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
	const eventsByTicket: Record<
		string,
		Awaited<ReturnType<typeof listTicketEvents>>
	> = {};
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
			<TicketsListWithSearch
				activeTickets={filterVisibleTickets(active.items, ctx)}
				resolvedTickets={resolvedItems}
				eventsByTicket={eventsByTicket}
			/>
		</div>
	);
}
