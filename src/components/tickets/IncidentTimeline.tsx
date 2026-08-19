"use client";

import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	GitMerge,
} from "lucide-react";
import {
	affectedService,
	buildIncidentTimelineSteps,
	formatIssueHistoryDate,
	getIncidentTimelineResourceLinks,
	type TimelineIconKind,
} from "@/lib/tickets/issue-history";
import type { Ticket, TicketEvent } from "@/lib/tickets/ticket.types";

import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { AffectedServicesHoverInfo } from "./AffectedServicesHoverInfo";

function TimelineIcon({ kind }: { kind: TimelineIconKind }) {
	if (kind === "alert") {
		return <AlertCircle className="h-4 w-4 text-red" />;
	}
	return <CheckCircle2 className="h-[18px] w-[18px] text-green" />;
}

export function IncidentTimeline({
	ticket,
	events,
}: {
	ticket: Ticket;
	events: TicketEvent[];
}) {
	const timeZone = useOrgTimezone();
	const steps = buildIncidentTimelineSteps(ticket, events);
	const resourceLinks = getIncidentTimelineResourceLinks(ticket, events);
	const service = affectedService(ticket);

	return (
		<ol className="incident-timeline">
			{steps.length === 0 ? (
				<li className="incident-timeline-item">
					<p className="text-sm text-slate-600">No updates recorded yet.</p>
				</li>
			) : null}
			{steps.map((step) => (
				<li key={step.id} className="incident-timeline-item">
					<AffectedServicesHoverInfo service={service} />
					<span className="absolute -left-[27px] top-4 z-10 rounded-full bg-white p-0.5">
						<TimelineIcon kind={step.iconKind} />
					</span>
					<p className="incident-timeline-heading pr-8">
						{step.heading}{" "}
						<span className="font-normal text-slate-600">
							{formatIssueHistoryDate(step.timestamp, timeZone)}
						</span>
						{step.externalHref ? (
							<a
								href={step.externalHref}
								className="ml-1 inline-flex align-middle text-[#0f5384] hover:text-[#0c436a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								target="_blank"
								rel="noreferrer"
								aria-label="Open GitHub issue"
							>
								<ExternalLink className="h-3.5 w-3.5" />
							</a>
						) : null}
					</p>
					<p className="incident-timeline-body">{step.body}</p>
					{step.links?.length ? (
						<div className="mt-2 flex min-w-0 flex-wrap gap-3 text-sm">
							{step.links.map((link) => (
								<a
									key={`${step.id}-${link.href}`}
									href={link.href}
									className="break-all text-[#0f5384] underline-offset-2 hover:underline"
									target="_blank"
									rel="noreferrer"
								>
									{link.label}
								</a>
							))}
						</div>
					) : null}
				</li>
			))}
			{/* GitHub section is permanent on incident timelines. */}
			<li className="incident-timeline-item incident-timeline-item-links">
				<span className="absolute -left-[27px] top-4 z-10 rounded-full bg-white p-0.5">
					<GitMerge className="h-4 w-4 text-[#0f5384]" />
				</span>
				<p className="incident-timeline-heading">GitHub</p>
				<div className="mt-2 flex min-w-0 flex-wrap items-center gap-3 text-sm">
					{resourceLinks.map((link) =>
						link.kind === "github-issue" ? (
							<span
								key={link.href}
								className="inline-flex items-center gap-1 text-[#0f5384]"
							>
								GitHub issue
								<a
									href={link.href}
									className="inline-flex text-[#0f5384] hover:text-[#0c436a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
									target="_blank"
									rel="noreferrer"
									aria-label="Open GitHub issue"
								>
									<ExternalLink className="h-3.75 w-3.75 shrink-0" />
								</a>
							</span>
						) : (
							<a
								key={link.href}
								href={link.href}
								className="break-all text-[#0f5384] underline-offset-2 hover:underline"
								target="_blank"
								rel="noreferrer"
							>
								{link.label}
							</a>
						),
					)}
				</div>
			</li>
		</ol>
	);
}
