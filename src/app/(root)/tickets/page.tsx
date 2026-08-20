export const dynamic = "force-dynamic";

import { TicketsListWithSearch } from "@/components/tickets/TicketsListWithSearch";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { listTickets } from "@/lib/tickets/ticket.repository";
import {
	canViewAllTickets,
	filterVisibleTickets,
} from "@/lib/tickets/ticket-access.policy";

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
			<div className="mb-4 w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">Tickets</h1>
				<p className="mt-2 max-w-4xl text-sm text-slate-600">
					Report product bugs, access problems, and IT requests. Each ticket
					gets a number and stays in this queue until it&apos;s resolved.
				</p>
			</div>
			<TicketsListWithSearch
				activeTickets={filterVisibleTickets(active.items, ctx)}
			/>
		</div>
	);
}
