import { CheckCircle2, CircleDot } from "lucide-react";

import Link from "next/link";

import type { IssueHistoryIncident } from "@/lib/tickets/issue-history";

import {

	eventSummary,

	formatIssueHistoryDate,

} from "@/lib/tickets/issue-history";

import { TicketStatusPill } from "./TicketStatusPill";



export function IssueHistoryIncidentCard({

	incident,

}: {

	incident: IssueHistoryIncident;

}) {

	const { ticket, events, latestEvent } = incident;

	const stamp = latestEvent?.timestamp || ticket.resolvedAt || ticket.submittedAt;

	const previousCount = Math.max(0, events.length - 1);

	const label = latestEvent

		? latestEvent.eventType === "DEPLOYED" || ticket.status === "RESOLVED"

			? "Resolved"

			: latestEvent.eventType.replaceAll("_", " ")

		: "Resolved";



	return (

		<Link

			href={`/incident/${ticket.$id}`}

			className="glass-card-inner interactive-glass-card issue-history-incident-card focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"

		>

			<div className="flex flex-wrap items-start justify-between gap-3">

				<p className="issue-history-incident-title">{ticket.title}</p>

				<TicketStatusPill status={ticket.status} />

			</div>

			<div className="issue-history-update-box">

				<div className="flex items-start gap-3">

					<CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-green" />

					<div className="min-w-0 flex-1">

						<p className="text-sm text-slate-700">

							<span className="font-medium">{label}</span>{" "}

							<span className="text-slate-600">

								{formatIssueHistoryDate(stamp)}

							</span>

						</p>

						<p className="mt-1 break-words text-sm text-slate-600">

							{eventSummary(latestEvent, ticket)}

						</p>

						{previousCount > 0 ? (

							<p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">

								<CircleDot className="h-3 w-3 shrink-0" />

								{previousCount} previous update

								{previousCount === 1 ? "" : "s"}

							</p>

						) : null}

					</div>

				</div>

			</div>

		</Link>

	);

}

