"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { normalizeTicketNumberQuery } from "@/lib/tickets/ticket-number.utils";
import type { Ticket, TicketEvent } from "@/lib/tickets/ticket.types";
import { PreviousIncidents } from "./PreviousIncidents";
import { TicketQueue } from "./TicketQueue";

function matchesTicketSearch(ticket: Ticket, rawQuery: string): boolean {
	const q = rawQuery.trim().toLowerCase();
	if (!q) return true;

	const normalizedNumber = normalizeTicketNumberQuery(rawQuery).toLowerCase();
	const number = (ticket.ticketNumber || "").toLowerCase();
	const title = ticket.title.toLowerCase();
	const description = (ticket.description || "").toLowerCase();
	const submitter = ticket.submittedByName.toLowerCase();

	return (
		number.includes(q) ||
		(normalizedNumber.length > 0 && number.includes(normalizedNumber)) ||
		title.includes(q) ||
		description.includes(q) ||
		submitter.includes(q)
	);
}

export function TicketsListWithSearch({
	activeTickets,
	resolvedTickets,
	eventsByTicket,
}: {
	activeTickets: Ticket[];
	resolvedTickets: Ticket[];
	eventsByTicket: Record<string, TicketEvent[]>;
}) {
	const [query, setQuery] = useState("");

	const filteredActive = useMemo(
		() => activeTickets.filter((ticket) => matchesTicketSearch(ticket, query)),
		[activeTickets, query],
	);
	const filteredResolved = useMemo(
		() =>
			resolvedTickets.filter((ticket) => matchesTicketSearch(ticket, query)),
		[resolvedTickets, query],
	);

	return (
		<div className="space-y-8">
			<div className="relative max-w-md">
				<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search by ticket number, title, or submitter…"
					aria-label="Search tickets"
					className="border-slate-200 bg-white pl-9 text-slate-700"
				/>
			</div>

			<section>
				<h2 className="mb-4 text-sm font-medium sidebar-gradient-text">
					Active
					{query.trim() ? (
						<span className="ml-2 font-normal text-slate-500">
							({filteredActive.length})
						</span>
					) : null}
				</h2>
				<TicketQueue tickets={filteredActive} />
			</section>

			<section>
				<h2 className="mb-4 text-sm font-medium sidebar-gradient-text">
					Previous incidents
					{query.trim() ? (
						<span className="ml-2 font-normal text-slate-500">
							({filteredResolved.length})
						</span>
					) : null}
				</h2>
				<PreviousIncidents
					tickets={filteredResolved}
					eventsByTicket={eventsByTicket}
				/>
			</section>
		</div>
	);
}
