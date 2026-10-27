import type { Ticket } from "./ticket.types";
import { getSeveritySlaHours } from "./ticket-intake.constants";

export type SlaState = {
	slaHours: number;
	elapsedHours: number;
	breached: boolean;
	/** Hours past the target (0 when within SLA). */
	overHours: number;
	/** Hours left before the target (0 once breached). */
	remainingHours: number;
	/** 0–100, never above 100. */
	percent: number;
	tone: "good" | "warn" | "bad";
};

/** Response SLA measured from when the ticket was filed. */
export function computeSla(
	ticket: Pick<Ticket, "severity" | "submittedAt">,
	now = Date.now(),
): SlaState {
	const slaHours = getSeveritySlaHours(ticket.severity);
	const elapsedHours =
		Math.max(0, now - new Date(ticket.submittedAt).getTime()) / 3_600_000;
	const ratio = elapsedHours / slaHours;
	return {
		slaHours,
		elapsedHours,
		breached: elapsedHours >= slaHours,
		overHours: Math.max(0, elapsedHours - slaHours),
		remainingHours: Math.max(0, slaHours - elapsedHours),
		percent: Math.min(100, ratio * 100),
		tone: ratio >= 1 ? "bad" : ratio >= 0.8 ? "warn" : "good",
	};
}

/** 67.6h → "2d 19h"; under a day → "5h 30m"; under an hour → "40m". */
export function formatHours(hours: number): string {
	const totalMinutes = Math.max(0, Math.round(hours * 60));
	const days = Math.floor(totalMinutes / 1440);
	const h = Math.floor((totalMinutes % 1440) / 60);
	const m = totalMinutes % 60;
	if (days > 0) return `${days}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}
