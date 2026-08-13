import { cn } from "@/lib/utils";
import type { TicketSeverity, TicketStatus } from "@/lib/tickets/ticket.types";

const STATUS_CLASS: Record<TicketStatus, string> = {
	OPEN: "bg-blue/10 text-blue border-blue/20",
	ASSIGNED: "bg-blue/10 text-[#0f5384] border-blue/20",
	IN_PROGRESS: "bg-orange/10 text-orange border-orange/20",
	PR_OPEN: "bg-green/10 text-green border-green/20",
	IN_REVIEW: "bg-green/10 text-green border-green/20",
	RESOLVED: "bg-slate-100 text-slate-600 border-slate-200",
	FAILED: "bg-red/10 text-red border-red/20",
	NEEDS_HUMAN: "bg-red/10 text-red border-red/20",
};

const SEVERITY_CLASS: Record<TicketSeverity, string> = {
	low: "bg-slate-100 text-slate-600 border-slate-200",
	medium: "bg-blue/10 text-blue border-blue/20",
	high: "bg-orange/10 text-orange border-orange/20",
	critical: "bg-red/10 text-red border-red/20",
};

export function TicketStatusPill({ status }: { status: TicketStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
				STATUS_CLASS[status],
			)}
		>
			{status.replaceAll("_", " ")}
		</span>
	);
}

export function TicketSeverityPill({ severity }: { severity: TicketSeverity }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
				SEVERITY_CLASS[severity],
			)}
		>
			{severity}
		</span>
	);
}

export function timeInStatus(iso: string): string {
	const then = new Date(iso).getTime();
	const delta = Math.max(0, Date.now() - then);
	const hours = Math.floor(delta / 3_600_000);
	if (hours < 1) return `${Math.max(1, Math.floor(delta / 60_000))}m`;
	if (hours < 48) return `${hours}h`;
	return `${Math.floor(hours / 24)}d`;
}
