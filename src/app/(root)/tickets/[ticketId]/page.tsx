export const dynamic = "force-dynamic";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assigneeIdFrom } from "@/components/tickets/detail/TicketAuditTrail";
import { TicketHeaderActions } from "@/components/tickets/detail/TicketHeaderActions";
import { TicketSheetProvider } from "@/components/tickets/detail/TicketSheetContext";
import { TicketDetail } from "@/components/tickets/TicketDetail";
import {
	TicketLanePill,
	TicketSeverityPill,
	TicketStatusPill,
} from "@/components/tickets/TicketStatusPill";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { getUserProfiles } from "@/lib/tickets/submitter-avatars";
import { getTicketById } from "@/lib/tickets/ticket.repository";
import { resolveTicketLane } from "@/lib/tickets/ticket.types";
import {
	canAssignTicket,
	canClaimTicket,
	canCloseTicket,
	canEscalateTicket,
	canStartFixAgent,
	canViewTicket,
} from "@/lib/tickets/ticket-access.policy";
import { listTicketAttachments } from "@/lib/tickets/ticket-attachments";
import { listTicketEvents } from "@/lib/tickets/ticket-events.repository";
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
	const attachments = await listTicketAttachments(ticket);
	const profiles = await getUserProfiles([
		ticket.submittedByUserId,
		ticket.assigneeCaalmUserId ?? "",
		...events.map((event) => event.actor),
		...events.map((event) => assigneeIdFrom(event.metadata) ?? ""),
	]);
	const access = { userId: user.$id, permissions };
	const number = displayTicketNumber(ticket);

	return (
		<TicketSheetProvider>
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<nav
					aria-label="breadcrumb"
					className="mb-2 flex items-center gap-1 text-xs text-slate-400"
				>
					<Link
						href="/tickets"
						className="font-medium text-[#078FAB] hover:underline"
					>
						Tickets
					</Link>
					<ChevronRight className="h-3 w-3" aria-hidden />
					<span aria-current="page">{number}</span>
				</nav>
				<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
					<div className="flex flex-col items-start gap-2">
						<h1 className="h1 capitalize sidebar-gradient-text">Ticket</h1>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-[13px] font-semibold text-[#078FAB]">
								{number}
							</span>
							<TicketLanePill lane={ticket.lane} />
							<TicketSeverityPill
								severity={ticket.severity}
								lane={resolveTicketLane(ticket)}
							/>
							<TicketStatusPill status={ticket.status} />
						</div>
					</div>
					<TicketHeaderActions githubIssueUrl={ticket.githubIssueUrl} />
				</div>
				<TicketDetail
					ticket={ticket}
					events={events}
					attachments={attachments}
					profiles={profiles}
					canAssign={canAssignTicket(ticket, access)}
					canClaim={canClaimTicket(ticket, access)}
					canClose={canCloseTicket(ticket, access)}
					canEscalate={canEscalateTicket(ticket, access)}
					canStartFixAgent={canStartFixAgent(ticket, access)}
				/>
			</div>
		</TicketSheetProvider>
	);
}
