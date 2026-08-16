export const dynamic = "force-dynamic";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IncidentTimeline } from "@/components/tickets/IncidentTimeline";
import { TicketStatusPill } from "@/components/tickets/TicketStatusPill";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import {
	affectedService,
	formatIssueHistoryDate,
} from "@/lib/tickets/issue-history";
import { canViewTicket } from "@/lib/tickets/ticket-access.policy";
import { listTicketEvents } from "@/lib/tickets/ticket-events.repository";
import { getTicketById } from "@/lib/tickets/ticket.repository";

export default async function IncidentDetailPage({
	params,
}: {
	params: Promise<{ incidentId: string }>;
}) {
	const user = await requirePagePermission(PERMISSIONS.TICKETS.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	const { incidentId } = await params;
	const ticket = await getTicketById(incidentId);
	if (!ticket || !canViewTicket(ticket, { userId: user.$id, permissions })) {
		notFound();
	}
	const events = await listTicketEvents(ticket.$id);
	const stamp = ticket.resolvedAt || ticket.submittedAt;

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
			<div className="incident-detail-shell">
				<Link
					href="/dashboard/it/issuehistory"
					className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors duration-200 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to overview
				</Link>
				<div className="glass-card incident-detail-card">
					<div className="glass-card-cap" />
					<div className="flex items-start justify-between gap-3">
						<h1 className="incident-detail-title min-w-0 sidebar-gradient-text">
							{ticket.title}
						</h1>
						<div className="shrink-0">
							<TicketStatusPill status={ticket.status} />
						</div>
					</div>
					<p className="mt-1 break-words text-sm text-slate-600">
						{formatIssueHistoryDate(stamp)}
					</p>
					<div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
						<span className="shrink-0 text-sm text-slate-600">
							Affected services
						</span>
						<span className="max-w-full break-words rounded-full border border-slate-200 bg-white/60 px-2.5 py-0.5 text-xs font-medium text-slate-700">
							{affectedService(ticket)}
						</span>
					</div>
					<IncidentTimeline ticket={ticket} events={events} />
				</div>
			</div>
		</div>
	);
}
