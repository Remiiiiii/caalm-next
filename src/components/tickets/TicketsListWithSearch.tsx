"use client";

import { useMemo, useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import type { Ticket, TicketLane } from "@/lib/tickets/ticket.types";
import { resolveTicketLane } from "@/lib/tickets/ticket.types";
import { normalizeTicketNumberQuery } from "@/lib/tickets/ticket-number.utils";
import { cn } from "@/lib/utils";
import { TicketQueue } from "./TicketQueue";

type LaneFilter = "all" | TicketLane;

function matchesTicketSearch(ticket: Ticket, rawQuery: string): boolean {
	const q = rawQuery.trim().toLowerCase();
	if (!q) return true;

	const normalizedNumber = normalizeTicketNumberQuery(rawQuery).toLowerCase();
	const number = (ticket.ticketNumber || "").toLowerCase();
	const title = ticket.title.toLowerCase();
	const description = (ticket.description || "").toLowerCase();
	const submitter = ticket.submittedByName.toLowerCase();
	const lane = resolveTicketLane(ticket);

	return (
		number.includes(q) ||
		(normalizedNumber.length > 0 && number.includes(normalizedNumber)) ||
		title.includes(q) ||
		description.includes(q) ||
		submitter.includes(q) ||
		lane.includes(q)
	);
}

const LANE_FILTERS: Array<{ value: LaneFilter; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "help", label: "Help" },
	{ value: "engineering", label: "Engineering" },
];

export function TicketsListWithSearch({
	activeTickets,
}: {
	activeTickets: Ticket[];
}) {
	const [query, setQuery] = useState("");
	const [laneFilter, setLaneFilter] = useState<LaneFilter>("all");

	const filteredActive = useMemo(
		() =>
			activeTickets.filter((ticket) => {
				if (laneFilter !== "all" && resolveTicketLane(ticket) !== laneFilter) {
					return false;
				}
				return matchesTicketSearch(ticket, query);
			}),
		[activeTickets, laneFilter, query],
	);

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<SearchField
					containerClassName="max-w-md w-full"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search by ticket number, title, or submitter…"
					aria-label="Search tickets"
				/>
				<div
					className="flex flex-wrap gap-2"
					role="tablist"
					aria-label="Filter by lane"
				>
					{LANE_FILTERS.map((filter) => {
						const selected = laneFilter === filter.value;
						return (
							<button
								key={filter.value}
								type="button"
								role="tab"
								aria-selected={selected}
								onClick={() => setLaneFilter(filter.value)}
								className={cn(
									"cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
									selected
										? "border-[#0f5384] bg-blue/10 text-[#0f5384]"
										: "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
								)}
							>
								{filter.label}
							</button>
						);
					})}
				</div>
			</div>

			<section>
				<h2 className="mb-4 text-sm font-medium sidebar-gradient-text">
					Active
					{query.trim() || laneFilter !== "all" ? (
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
