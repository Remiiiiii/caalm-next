export const dynamic = "force-dynamic";

import { TicketQueue } from "@/components/tickets/TicketQueue";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { canViewAllTickets, filterVisibleTickets } from "@/lib/tickets/ticket-access.policy";
import { listTickets } from "@/lib/tickets/ticket.repository";

export default async function TicketsPage() {
	const user = await requirePagePermission(PERMISSIONS.TICKETS.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) return null;
	const permissions = await getUserPermissions(user.$id, org.orgId);
	const ownOnly = !canViewAllTickets(permissions);
	const ctx = { userId: user.$id, permissions };

	const active = await listTickets({
		orgId: org.orgId,
		status: "active",
		submittedByUserId: ownOnly ? user.$id : undefined,
		limit: 50,
	});

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">Tickets</h1>
			</div>
			<section>
				<h2 className="mb-4 text-sm font-medium sidebar-gradient-text">
					Active
				</h2>
				<TicketQueue tickets={filterVisibleTickets(active.items, ctx)} />
			</section>
		</div>
	);
}
