"use client";

import { AlertCircle, Info, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { Ticket, TicketLane } from "@/lib/tickets/ticket.types";
import { resolveTicketLane } from "@/lib/tickets/ticket.types";
import { normalizeTicketNumberQuery } from "@/lib/tickets/ticket-number.utils";
import {
	computeQueueStats,
	DEFAULT_SORT_DIR,
	QUEUE_PAGE_SIZE,
	type QueueSortKey,
	type SortDir,
	sortTicketsBy,
} from "@/lib/tickets/ticket-queue";
import { DATA_TABLE_TOOLBAR_INSET } from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";
import { TicketQueue } from "./TicketQueue";
import { TicketStatCards } from "./TicketStatCards";

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
	avatarUrls,
	ownOnly,
	canCreate,
	capped,
	total,
}: {
	activeTickets: Ticket[];
	/** Submitter photo URLs by user id; missing ids show initials. */
	avatarUrls: Record<string, string>;
	/** The viewer only sees tickets they submitted. */
	ownOnly: boolean;
	canCreate: boolean;
	/** The server returned its maximum page, so more tickets may exist. */
	capped: boolean;
	total: number;
}) {
	const [query, setQuery] = useState("");
	const [laneFilter, setLaneFilter] = useState<LaneFilter>("all");
	const [sortKey, setSortKey] = useState<QueueSortKey>("severity");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [page, setPage] = useState(1);

	const stats = useMemo(
		() => computeQueueStats(activeTickets),
		[activeTickets],
	);

	const filtered = useMemo(
		() =>
			sortTicketsBy(
				activeTickets.filter((ticket) => {
					if (
						laneFilter !== "all" &&
						resolveTicketLane(ticket) !== laneFilter
					) {
						return false;
					}
					return matchesTicketSearch(ticket, query);
				}),
				sortKey,
				sortDir,
			),
		[activeTickets, laneFilter, query, sortKey, sortDir],
	);

	// A new search, lane or sort starts back on the first page.
	useEffect(() => {
		setPage(1);
	}, [query, laneFilter, sortKey, sortDir]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / QUEUE_PAGE_SIZE));
	const currentPage = Math.min(page, pageCount);
	const pageRows = filtered.slice(
		(currentPage - 1) * QUEUE_PAGE_SIZE,
		currentPage * QUEUE_PAGE_SIZE,
	);

	const onSort = (key: QueueSortKey) => {
		if (key === sortKey) {
			setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(DEFAULT_SORT_DIR[key]);
		}
	};

	const trimmedQuery = query.trim();

	const emptyState =
		activeTickets.length === 0 ? (
			ownOnly ? (
				<>
					<AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-500" />
					<p className="text-sm font-medium text-slate-700">
						You haven&apos;t submitted any tickets yet.
					</p>
					{canCreate ? (
						<Button asChild className="btn-primary mt-4 px-3 sm:px-4">
							<Link href="/tickets/new">
								<Plus className="h-4 w-4" aria-hidden />
								New ticket
							</Link>
						</Button>
					) : null}
				</>
			) : (
				<>
					<AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-500" />
					<p className="text-sm font-medium text-slate-700">
						No active tickets — your queue is clear.
					</p>
					<p className="mt-1 text-xs text-slate-600">
						New tickets will appear here when submitted.
					</p>
				</>
			)
		) : (
			<>
				<AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-500" />
				<p className="text-sm font-medium text-slate-700">
					{trimmedQuery
						? `No tickets match "${trimmedQuery}".`
						: "No tickets in this lane."}
				</p>
				{trimmedQuery ? (
					<button
						type="button"
						onClick={() => setQuery("")}
						className="mt-2 cursor-pointer rounded-sm text-xs font-medium text-[#0f5384] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					>
						Clear search
					</button>
				) : null}
			</>
		);

	return (
		<div className="space-y-6">
			<TicketStatCards stats={stats} />

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-0 text-slate-700">
					<div
						className={cn(
							"flex flex-col gap-3 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between",
							DATA_TABLE_TOOLBAR_INSET,
						)}
					>
						<SearchField
							containerClassName="w-full sm:max-w-md"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search by ticket number, title, or submitter…"
							aria-label="Search tickets"
						/>
						<SegmentedToggle<LaneFilter>
							ariaLabel="Filter by lane"
							value={laneFilter}
							onChange={setLaneFilter}
							tabs={LANE_FILTERS}
						/>
					</div>

					<TicketQueue
						tickets={pageRows}
						avatarUrls={avatarUrls}
						sortKey={sortKey}
						onSort={onSort}
						empty={emptyState}
					/>

					<PageIndex
						page={currentPage}
						onPageChange={setPage}
						totalItems={filtered.length}
						pageSize={QUEUE_PAGE_SIZE}
						showRange
						itemLabel="tickets"
						hideWhenSinglePage
					/>
				</CardContent>
			</Card>

			{activeTickets.length > 0 ? (
				<p className="flex items-start gap-2 text-xs text-slate-500">
					<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
					{capped
						? `Showing ${activeTickets.length} of ${total} active tickets. Some tickets may not be visible.`
						: `Showing ${activeTickets.length} of ${activeTickets.length} active tickets. Resolved tickets are not shown here.`}
				</p>
			) : null}
		</div>
	);
}
