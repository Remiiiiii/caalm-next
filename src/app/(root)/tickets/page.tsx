export const dynamic = "force-dynamic";

import { TicketPlus } from "lucide-react";
import Link from "next/link";
import { TicketsListWithSearch } from "@/components/tickets/TicketsListWithSearch";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { getUserProfiles } from "@/lib/tickets/submitter-avatars";
import { listTickets } from "@/lib/tickets/ticket.repository";
import type { Ticket } from "@/lib/tickets/ticket.types";
import {
	canAssignTicket,
	canViewAllTickets,
	filterVisibleTickets,
} from "@/lib/tickets/ticket-access.policy";
import { sortTicketsForQueue } from "@/lib/tickets/ticket-queue";

const QUEUE_LIMIT = 50;

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
		limit: QUEUE_LIMIT,
	});

	const canCreate = permissions.includes(PERMISSIONS.TICKETS.CREATE);
	const visibleTickets = sortTicketsForQueue(
		filterVisibleTickets(active.items, ctx),
	);
	const profiles = await getUserProfiles(
		visibleTickets.flatMap((ticket) => [
			ticket.submittedByUserId,
			ticket.assigneeCaalmUserId ?? "",
		]),
	);
	const avatarUrls: Record<string, string> = {};
	for (const [id, profile] of Object.entries(profiles)) {
		if (profile.avatarUrl) avatarUrls[id] = profile.avatarUrl;
	}
	// Assigning is not tied to one ticket here, so check against an open one.
	const canAssign = canAssignTicket({ status: "OPEN" } as Ticket, ctx);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<h1 className="h1 capitalize sidebar-gradient-text">Tickets</h1>
			<div className="flex  justify-between mb-6">
				<p className="mt-2 max-w-4xl text-sm text-slate-600">
					Report product bugs, access problems, and IT requests. Each ticket
					gets a number and stays in this queue until it&apos;s resolved.
				</p>
				{canCreate ? (
					<Button asChild variant="brand">
						<Link href="/tickets/new">
							<TicketPlus className="h-4 w-4" aria-hidden />
							New ticket
						</Link>
					</Button>
				) : null}
			</div>
			<TicketsListWithSearch
				activeTickets={visibleTickets}
				avatarUrls={avatarUrls}
				assigneeProfiles={profiles}
				canAssign={canAssign}
				ownOnly={ownOnly}
				canCreate={canCreate}
				capped={active.items.length >= QUEUE_LIMIT}
				total={active.total}
			/>
		</div>
	);
}
