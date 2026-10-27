"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import Avatar from "@/components/ui/avatar";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_CELL_FIRST,
	DATA_TABLE_CELL_LAST,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	SortableDataTableHead,
} from "@/components/ui/caalm-data-table";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Ticket, TicketSeverity } from "@/lib/tickets/ticket.types";
import { resolveTicketLane } from "@/lib/tickets/ticket.types";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";
import {
	hoursInStatus,
	type QueueSortKey,
	type StatusAge,
	statusAge,
} from "@/lib/tickets/ticket-queue";
import { cn } from "@/lib/utils";
import {
	TicketLanePill,
	TicketSeverityPill,
	TicketStatusPill,
	timeInStatus,
} from "./TicketStatusPill";

/** 4px severity bar on the row's left edge (decorative). */
const SEVERITY_ACCENT: Record<TicketSeverity, string> = {
	critical:
		"[&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-1 [&>td:first-child]:before:bg-red",
	high: "[&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-1 [&>td:first-child]:before:bg-orange",
	medium:
		"[&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-1 [&>td:first-child]:before:bg-blue",
	low: "[&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-1 [&>td:first-child]:before:bg-green",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});
const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
	hour: "numeric",
	minute: "2-digit",
});

const AGE_CLASS: Record<StatusAge, string> = {
	normal: "text-slate-600",
	aging: "text-orange",
	stale: "text-red",
};

export function TicketQueue({
	tickets,
	avatarUrls,
	sortKey,
	onSort,
	empty,
}: {
	/** The rows for the current page. */
	tickets: Ticket[];
	/** Submitter photo URLs by user id; missing ids show initials. */
	avatarUrls: Record<string, string>;
	sortKey: QueueSortKey;
	onSort: (key: QueueSortKey) => void;
	/** Shown instead of the table when there is nothing to render. */
	empty: ReactNode;
}) {
	const router = useRouter();

	if (tickets.length === 0) {
		return <div className="px-4 py-12 text-center text-slate-700">{empty}</div>;
	}

	return (
		<TooltipProvider delayDuration={200}>
			<CaalmDataTable className="pt-2">
				<TableHeader className="[&_tr]:border-b-0">
					<TableRow className={DATA_TABLE_HEADER_ROW}>
						<SortableDataTableHead
							label="Ticket"
							active={sortKey === "ticket"}
							onClick={() => onSort("ticket")}
							className="pl-4 pr-2"
						/>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Title
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Submitted by
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Submitted on
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Submitted at
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Lane
						</TableHead>
						<SortableDataTableHead
							label="Severity"
							active={sortKey === "severity"}
							onClick={() => onSort("severity")}
						/>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Status
						</TableHead>
						<SortableDataTableHead
							label="In status"
							active={sortKey === "age"}
							onClick={() => onSort("age")}
							className="pl-3 pr-4"
						/>
					</TableRow>
				</TableHeader>
				<TableBody className="[&_tr:last-child>td]:border-b-0">
					{tickets.map((ticket) => {
						const number = displayTicketNumber(ticket);
						const age = statusAge(hoursInStatus(ticket));
						const open = () => router.push(`/tickets/${ticket.$id}`);
						return (
							<TableRow
								key={ticket.$id}
								className={cn(
									DATA_TABLE_BODY_ROW_CLICKABLE,
									"bg-transparent",
									SEVERITY_ACCENT[ticket.severity],
								)}
								onClick={open}
							>
								<TableCell className={cn(DATA_TABLE_CELL_FIRST, "pl-5")}>
									<Link
										href={`/tickets/${ticket.$id}`}
										aria-label={`${number}: ${ticket.title}`}
										onClick={(event) => event.stopPropagation()}
										className="whitespace-nowrap text-xs font-semibold tracking-wide text-[#0f5384] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
									>
										{number}
									</Link>
								</TableCell>
								<TableCell className={DATA_TABLE_CELL}>
									<p className="max-w-md min-w-[12rem] truncate text-sm font-medium text-slate-700">
										{ticket.title}
									</p>
								</TableCell>
								<TableCell className={DATA_TABLE_CELL}>
									<div className="flex flex-col items-start gap-1">
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													aria-label={ticket.submittedByName}
													className="inline-flex cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
												>
													<div className="flex items-center">
														<Avatar
															name={ticket.submittedByName}
															userId={ticket.submittedByUserId}
															size="sm"
															imageUrl={avatarUrls[ticket.submittedByUserId]}
														/>
													</div>
												</button>
											</TooltipTrigger>
											<TooltipContent>{ticket.submittedByName}</TooltipContent>
											<p className="text-xs text-slate-500">
												<span className="font-bold text-[#0f5384]">
													{ticket.department}{" "}
												</span>
												- Dept.
											</p>
										</Tooltip>
									</div>
								</TableCell>
								<TableCell
									className={cn(
										DATA_TABLE_CELL,
										"whitespace-nowrap text-sm text-slate-600",
									)}
									suppressHydrationWarning
								>
									{DATE_FORMAT.format(new Date(ticket.submittedAt))}
								</TableCell>
								<TableCell
									className={cn(
										DATA_TABLE_CELL,
										"whitespace-nowrap text-sm tabular-nums text-slate-600",
									)}
									suppressHydrationWarning
								>
									{TIME_FORMAT.format(new Date(ticket.submittedAt))}
								</TableCell>
								<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
									<TicketLanePill lane={ticket.lane} />
								</TableCell>
								<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
									<TicketSeverityPill
										severity={ticket.severity}
										lane={resolveTicketLane(ticket)}
									/>
								</TableCell>
								<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
									<TicketStatusPill status={ticket.status} />
								</TableCell>
								<TableCell
									className={cn(
										DATA_TABLE_CELL_LAST,
										"whitespace-nowrap text-sm tabular-nums",
										AGE_CLASS[age],
									)}
								>
									{timeInStatus(ticket.$updatedAt || ticket.submittedAt)}
									{age === "stale" ? (
										<span className="sr-only"> (urgent)</span>
									) : null}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</CaalmDataTable>
		</TooltipProvider>
	);
}
