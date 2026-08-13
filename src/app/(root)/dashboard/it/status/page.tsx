export const dynamic = "force-dynamic";

import { Activity } from "lucide-react";
import { ITPageShell } from "@/components/it/ITPageShell";
import { PreviousIncidents } from "@/components/tickets/PreviousIncidents";
import { TicketQueue } from "@/components/tickets/TicketQueue";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { canViewAllTickets, filterVisibleTickets } from "@/lib/tickets/ticket-access.policy";
import { listTicketEvents } from "@/lib/tickets/ticket-events.repository";
import { listTickets } from "@/lib/tickets/ticket.repository";

export default async function TicketStatusPage() {
	const user = await requirePagePermission(PERMISSIONS.TICKETS.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return null;
	}
	const permissions = await getUserPermissions(user.$id, org.orgId);
	const ownOnly = !canViewAllTickets(permissions);

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
			limit: 30,
		}),
	]);

	const ctx = { userId: user.$id, permissions };
	const activeItems = filterVisibleTickets(active.items, ctx);
	const resolvedItems = filterVisibleTickets(resolved.items, ctx);

	const eventsByTicket: Record<string, Awaited<ReturnType<typeof listTicketEvents>>> =
		{};
	await Promise.all(
		resolvedItems.map(async (ticket) => {
			eventsByTicket[ticket.$id] = await listTicketEvents(ticket.$id);
		}),
	);

	return (
		<ITPageShell
			title="Status"
			subtitle="Active tickets and previous incidents."
			icon={Activity}
		>
			<div className="space-y-8">
				<section>
					<h2 className="mb-4 text-sm font-medium sidebar-gradient-text">
						Active queue
					</h2>
					<TicketQueue tickets={activeItems} />
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
		</ITPageShell>
	);
}
