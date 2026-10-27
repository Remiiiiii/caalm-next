import { Card, CardContent } from "@/components/ui/card";
import type { Ticket } from "@/lib/tickets/ticket.types";
import { severityLevelNumber } from "@/lib/tickets/ticket-queue";
import { computeSla, formatHours } from "@/lib/tickets/ticket-sla";
import { cn } from "@/lib/utils";
import { formatTicketDate } from "./format";

const TONE_BOX = {
	good: "border-green/30 bg-green/10",
	warn: "border-orange/30 bg-orange/10",
	bad: "border-orange/30 bg-orange/10",
} as const;

const TONE_TEXT = {
	good: "text-green",
	warn: "text-orange",
	bad: "text-red",
} as const;

const TONE_FILL = {
	good: "bg-green",
	warn: "bg-orange",
	bad: "bg-red",
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
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-3 p-4 sm:p-6" suppressHydrationWarning>
				<p className="text-sm font-medium sidebar-gradient-text">SLA status</p>
				<div
					className={cn("space-y-2 rounded-lg border p-3", TONE_BOX[sla.tone])}
				>
					<p className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">
						{sla.breached ? "Breached" : "Time remaining"}
					</p>
					<p className={cn("text-xl font-bold", TONE_TEXT[sla.tone])}>
						{sla.breached
							? `Breached · ${formatHours(sla.overHours)} over`
							: formatHours(sla.remainingHours)}
					</p>
					<p className="text-[11px] text-slate-500">
						SLA target was {sla.slaHours}h (SEV-
						{severityLevelNumber(ticket.severity)})
					</p>
					<div
						className="h-1 overflow-hidden rounded-full bg-slate-200"
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
				<div className="flex items-center justify-between text-[11.5px] text-slate-500">
					<span>Opened {formatTicketDate(ticket.submittedAt, timeZone)}</span>
					{resolved ? null : (
						<span>
							{daysInQueue} {daysInQueue === 1 ? "day" : "days"} in queue
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
