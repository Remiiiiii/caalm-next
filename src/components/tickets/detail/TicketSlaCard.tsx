import type { Ticket } from "@/lib/tickets/ticket.types";
import { severityLevelNumber } from "@/lib/tickets/ticket-queue";
import { computeSla, formatHours } from "@/lib/tickets/ticket-sla";
import { cn } from "@/lib/utils";
import { formatTicketDate } from "./format";
import { SheetSection } from "./SheetSection";

const TONE_BOX = {
	good: "border-green/30 bg-green/10",
	warn: "border-[#fcd9bd] bg-[#fff8f3]",
	bad: "border-[#fcd9bd] bg-[#fff8f3]",
} as const;

const TONE_TEXT = {
	good: "text-green",
	warn: "text-orange",
	bad: "text-[#b80000]",
} as const;

const TONE_FILL = {
	good: "bg-green",
	warn: "bg-orange",
	bad: "bg-[#FF7474]",
} as const;

export function TicketSlaCard({
	ticket,
	timeZone,
}: {
	ticket: Ticket;
	timeZone: string;
}) {
	const sla = computeSla(ticket);
	const resolved = ticket.status === "RESOLVED";
	const daysInQueue = Math.floor(sla.elapsedHours / 24);

	return (
		<div suppressHydrationWarning>
			<SheetSection title="SLA status">
				<div
					className={cn("space-y-2 rounded-lg border p-3", TONE_BOX[sla.tone])}
				>
					<p
						className={cn(
							"text-[9.5px] font-bold uppercase tracking-[0.07em]",
							sla.breached ? "text-[#b45309]" : "text-slate-500",
						)}
					>
						{sla.breached ? "Breached" : "Time remaining"}
					</p>
					<p
						className={cn(
							"text-lg font-bold tracking-tight",
							TONE_TEXT[sla.tone],
						)}
					>
						{sla.breached
							? `${formatHours(sla.overHours)} over`
							: formatHours(sla.remainingHours)}
					</p>
					<p className="text-[11px] text-[#b45309]/70">
						SLA target was {sla.slaHours}h (SEV-
						{severityLevelNumber(ticket.severity)})
					</p>
					<div
						className="h-1 overflow-hidden rounded-full bg-[#fcd9bd]"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(sla.percent)}
						aria-label="Share of SLA time used"
					>
						<div
							className={cn("h-full rounded-full", TONE_FILL[sla.tone])}
							style={{ width: `${sla.percent}%` }}
						/>
					</div>
				</div>
				<div className="flex items-center justify-between text-[11px] text-slate-400">
					<span>Opened {formatTicketDate(ticket.submittedAt, timeZone)}</span>
					{resolved ? null : (
						<span>
							{daysInQueue} {daysInQueue === 1 ? "day" : "days"} in queue
						</span>
					)}
				</div>
			</SheetSection>
		</div>
	);
}
