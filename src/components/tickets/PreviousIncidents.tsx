"use client";

import { ChevronDown, GitMerge } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { Ticket, TicketEvent } from "@/lib/tickets/ticket.types";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";
import { TicketSeverityPill, TicketStatusPill } from "./TicketStatusPill";

export function PreviousIncidents({
	tickets,
	eventsByTicket,
}: {
	tickets: Ticket[];
	eventsByTicket: Record<string, TicketEvent[]>;
}) {
	if (tickets.length === 0) {
		return (
			<p className="text-sm text-slate-600">No previous incidents reported.</p>
		);
	}

	return (
		<div className="space-y-3">
			{tickets.map((ticket) => (
				<PreviousIncidentRow
					key={ticket.$id}
					ticket={ticket}
					events={eventsByTicket[ticket.$id] || []}
				/>
			))}
		</div>
	);
}

function PreviousIncidentRow({
	ticket,
	events,
}: {
	ticket: Ticket;
	events: TicketEvent[];
}) {
	const [open, setOpen] = useState(false);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<button
					type="button"
					onClick={() => setOpen((value) => !value)}
					className="flex w-full cursor-pointer items-start justify-between gap-3 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					<div>
						<p className="font-mono text-xs font-semibold tracking-wide text-[#0f5384]">
							{displayTicketNumber(ticket)}
						</p>
						<p className="mt-1 text-sm font-medium text-slate-700">{ticket.title}</p>
						<p className="mt-1 text-xs text-slate-600">
							{new Date(ticket.submittedAt).toUTCString()}
							{ticket.resolvedAt
								? ` → ${new Date(ticket.resolvedAt).toUTCString()}`
								: ""}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<TicketSeverityPill severity={ticket.severity} />
						<TicketStatusPill status={ticket.status} />
						<ChevronDown
							className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
						/>
					</div>
				</button>
				{open ? (
					<ol className="mt-4 space-y-2 border-t border-slate-200 pt-4">
						{events.map((event) => (
							<li key={event.$id} className="text-xs text-slate-600">
								<span className="font-medium text-slate-700">
									{event.eventType.replaceAll("_", " ")}
								</span>{" "}
								· {new Date(event.timestamp).toUTCString()} · {event.actor}
							</li>
						))}
						{ticket.prUrl ? (
							<li className="flex items-center gap-2 text-xs">
								<GitMerge className="h-3 w-3 text-[#0f5384]" />
								<a
									href={ticket.prUrl}
									className="text-[#0f5384] underline-offset-2 hover:underline"
									target="_blank"
									rel="noreferrer"
								>
									Merged PR
								</a>
								{ticket.githubIssueUrl ? (
									<a
										href={ticket.githubIssueUrl}
										className="text-[#0f5384] underline-offset-2 hover:underline"
										target="_blank"
										rel="noreferrer"
									>
										Closed issue
									</a>
								) : null}
							</li>
						) : null}
					</ol>
				) : null}
			</CardContent>
		</Card>
	);
}
