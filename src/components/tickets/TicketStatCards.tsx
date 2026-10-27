"use client";

import {
	AlertTriangle,
	ArrowUp,
	Clock,
	ListChecks,
	OctagonAlert,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import type { Ticket } from "@/lib/tickets/ticket.types";
import { getSeveritySlaHours } from "@/lib/tickets/ticket-intake.constants";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";
import {
	ageHours,
	hoursInStatus,
	type QueueStats,
} from "@/lib/tickets/ticket-queue";
import { cn } from "@/lib/utils";
import { TicketLanePill, timeInStatus } from "./TicketStatusPill";

const STALE_DAYS = 30;
const MAX_TICKET_PILLS = 3;

type ChipTone = "bad" | "good" | "neutral";

const CHIP_TONE: Record<ChipTone, string> = {
	bad: "bg-red/10 text-red border-red/20",
	good: "bg-green/10 text-green border-green/20",
	neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

function DeltaChip({
	tone,
	children,
}: {
	tone: ChipTone;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				"inline-flex w-fit items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
				CHIP_TONE[tone],
			)}
		>
			{children}
		</span>
	);
}

function MiniStat({ label, value }: { label: string; value: number }) {
	return (
		<div className="min-w-0">
			<p className="truncate text-[10px] text-slate-500">{label}</p>
			<p className="text-sm font-semibold tabular-nums text-[#0f5384]">
				{value}
			</p>
		</div>
	);
}

function TicketPills({
	tickets,
	tone,
}: {
	tickets: Ticket[];
	tone: "bad" | "warn";
}) {
	if (tickets.length === 0) return null;
	const shown = tickets.slice(0, MAX_TICKET_PILLS);
	const extra = tickets.length - shown.length;
	return (
		<div className="flex flex-wrap gap-1.5">
			{shown.map((ticket) => (
				<Link
					key={ticket.$id}
					href={`/tickets/${ticket.$id}`}
					className={cn(
						"rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						tone === "bad"
							? "border-red/20 bg-red/10 text-red hover:bg-red/20"
							: "border-orange/20 bg-orange/10 text-orange hover:bg-orange/20",
					)}
				>
					{displayTicketNumber(ticket)}
				</Link>
			))}
			{extra > 0 ? (
				<span className="self-center text-[11px] text-slate-500">
					+{extra} more
				</span>
			) : null}
		</div>
	);
}

/** Label row above, 4px bar below; `fillClassName` colors the fill. */
function AgeBar({
	left,
	right,
	rightClassName,
	percent,
	fillClassName,
	trackClassName,
}: {
	left: ReactNode;
	right: ReactNode;
	rightClassName?: string;
	percent: number;
	fillClassName?: string;
	/** Replaces the plain track, e.g. a gradient that the fill uncovers. */
	trackClassName?: string;
}) {
	const pct = Math.max(0, Math.min(100, percent));
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-2 text-[10.5px] text-slate-500">
				<span className="truncate">{left}</span>
				<span className={cn("shrink-0 text-[11px] font-bold", rightClassName)}>
					{right}
				</span>
			</div>
			<div
				className={cn(
					"relative h-1 overflow-hidden rounded-full",
					trackClassName ?? "bg-slate-100",
				)}
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(pct)}
			>
				{trackClassName ? (
					<span
						className="absolute inset-y-0 right-0 bg-slate-100"
						style={{ width: `${100 - pct}%` }}
					/>
				) : (
					<span
						className={cn("block h-full rounded-full", fillClassName)}
						style={{ width: `${pct}%` }}
					/>
				)}
			</div>
		</div>
	);
}

function FooterLine({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"mt-3 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500",
				className,
			)}
		>
			{children}
		</p>
	);
}

function Strong({
	children,
	on = true,
}: {
	children: ReactNode;
	on?: boolean;
}) {
	return on ? (
		<strong className="font-semibold text-slate-700">{children}</strong>
	) : (
		<>{children}</>
	);
}

function SeverityCard({
	title,
	icon,
	severity,
	tickets,
	tone,
	footer,
}: {
	title: string;
	icon: typeof OctagonAlert;
	severity: "critical" | "high";
	tickets: Ticket[];
	tone: "danger" | "warning";
	footer: (breached: boolean) => ReactNode;
}) {
	const sla = getSeveritySlaHours(severity);
	const oldest = tickets[0];
	const hours = oldest ? hoursInStatus(oldest) : 0;
	const breached = Boolean(oldest) && hours >= sla;
	const bad = severity === "critical";
	const age = oldest
		? timeInStatus(oldest.$updatedAt || oldest.submittedAt)
		: "";

	return (
		<MetricStatCard
			title={title}
			icon={icon}
			value={tickets.length}
			valueTone={tickets.length > 0 ? tone : "default"}
			pinFooter
			valueAside={<DeltaChip tone="neutral">SLA: {sla}h</DeltaChip>}
			description={
				<TicketPills tickets={tickets} tone={bad ? "bad" : "warn"} />
			}
			footer={
				<div>
					{oldest ? (
						<AgeBar
							left={bad ? "Time in status" : `Oldest — ${age} in status`}
							right={
								bad
									? `${age} / ${sla}h SLA`
									: breached
										? "SLA breached"
										: "Within SLA"
							}
							rightClassName={
								breached ? (bad ? "text-red" : "text-orange") : "text-green"
							}
							percent={(hours / sla) * 100}
							fillClassName={bad ? "bg-red" : "bg-orange"}
						/>
					) : null}
					<FooterLine className={breached && bad ? "border-red/20" : undefined}>
						{footer(breached)}
					</FooterLine>
				</div>
			}
		/>
	);
}

export function TicketStatCards({ stats }: { stats: QueueStats }) {
	const { oldest } = stats;
	const oldestDays = oldest ? ageHours(oldest) / 24 : 0;
	const stale = oldestDays > STALE_DAYS;
	const multiple = stats.avgAgeDays > 0 ? oldestDays / stats.avgAgeDays : 0;
	const highInProgress = stats.highTickets.filter((t) =>
		["IN_PROGRESS", "PR_OPEN", "IN_REVIEW"].includes(t.status),
	).length;
	const highUnassigned = stats.highTickets.filter(
		(t) => !t.assigneeCaalmUserId && !t.assigneeGithubLogin,
	).length;

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			<MetricStatCard
				title="Active tickets"
				icon={ListChecks}
				value={stats.active}
				pinFooter
				valueAside={
					stats.newThisWeek > 0 ? (
						<DeltaChip tone="bad">
							<ArrowUp className="h-3 w-3" aria-hidden />
							{stats.newThisWeek} new this week
						</DeltaChip>
					) : (
						<DeltaChip tone="neutral">None new this week</DeltaChip>
					)
				}
				description={
					<div className="grid grid-cols-4 gap-2">
						<MiniStat label="Help" value={stats.help} />
						<MiniStat label="Engineering" value={stats.engineering} />
						<MiniStat label="In progress" value={stats.inProgress} />
						<MiniStat label="Attention" value={stats.needsAttention} />
					</div>
				}
				footer={
					<FooterLine>
						<Strong on={stats.unassigned > 0}>
							{stats.unassigned} unassigned
						</Strong>
						{" · "}
						<Strong on={stats.openOver24h > 0}>
							{stats.openOver24h} open &gt; 24h
						</Strong>
					</FooterLine>
				}
			/>

			<SeverityCard
				title="Critical — SEV-1"
				icon={OctagonAlert}
				severity="critical"
				tickets={stats.criticalTickets}
				tone="danger"
				footer={(breached) =>
					stats.critical === 0 ? (
						"No critical tickets"
					) : breached ? (
						<span className="text-red">
							SLA breached · needs immediate action
						</span>
					) : (
						<span className="text-green">Within SLA</span>
					)
				}
			/>

			<SeverityCard
				title="High — SEV-2"
				icon={AlertTriangle}
				severity="high"
				tickets={stats.highTickets}
				tone="warning"
				footer={() => (
					<>
						<Strong on={false}>{highInProgress} in progress</Strong>
						{" · "}
						<Strong on={highUnassigned > 0}>{highUnassigned} unassigned</Strong>
					</>
				)}
			/>

			<MetricStatCard
				title="Oldest open ticket"
				icon={Clock}
				value={oldest ? timeInStatus(oldest.submittedAt) : "—"}
				valueTone={stale ? "danger" : "default"}
				pinFooter
				valueAside={
					oldest ? (
						stale ? (
							<DeltaChip tone="bad">
								<ArrowUp className="h-3 w-3" aria-hidden />
								stale
							</DeltaChip>
						) : (
							<DeltaChip tone="neutral">Within {STALE_DAYS}d</DeltaChip>
						)
					) : null
				}
				description={
					oldest ? (
						<div className="flex flex-col gap-2 text-slate-600">
							<div className="flex items-center gap-3">
								<Link
									href={`/tickets/${oldest.$id}`}
									className="text-xs font-semibold text-[#078FAB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								>
									{displayTicketNumber(oldest)}
								</Link>
								<TicketLanePill lane={oldest.lane} />
							</div>
						</div>
					) : (
						"No active tickets"
					)
				}
				footer={
					oldest ? (
						<div>
							<AgeBar
								left={`Age vs avg (${Math.round(stats.avgAgeDays)}d)`}
								right={multiple > 1 ? `${multiple.toFixed(1)}× longer` : "—"}
								rightClassName={multiple > 2 ? "text-red" : "text-slate-600"}
								percent={(oldestDays / STALE_DAYS) * 100}
								trackClassName="bg-gradient-to-r from-green via-orange to-red"
							/>
							<FooterLine>
								<Strong>{oldest.title}</Strong> · {oldest.submittedByName}
							</FooterLine>
						</div>
					) : null
				}
			/>
		</div>
	);
}
