"use client";

import { useMemo, useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import { normalizeTicketNumberQuery } from "@/lib/tickets/ticket-number.utils";
import type { Ticket } from "@/lib/tickets/ticket.types";
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
}: {
	activeTickets: Ticket[];
}) {
	const [query, setQuery] = useState("");

	const filteredActive = useMemo(
		() => activeTickets.filter((ticket) => matchesTicketSearch(ticket, query)),
		[activeTickets, query],
	);

	return (
		<div className="space-y-8">
			<SearchField
				containerClassName="max-w-md"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder="Search by ticket number, title, or submitter…"
				aria-label="Search tickets"
			/>

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
		</div>
	);
}
