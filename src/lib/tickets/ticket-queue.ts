import type { Ticket, TicketSeverity } from "@/lib/tickets/ticket.types";

/** SEV-1 first. */
const SEVERITY_RANK: Record<TicketSeverity, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
};

export function severityLevelNumber(severity: TicketSeverity): number {
	return SEVERITY_RANK[severity] + 1;
}

/** Hours since the ticket last changed status (falls back to when it was filed). */
export function hoursInStatus(ticket: Ticket, now = Date.now()): number {
	const since = new Date(ticket.$updatedAt || ticket.submittedAt).getTime();
	return Math.max(0, now - since) / 3_600_000;
}

export type StatusAge = "normal" | "aging" | "stale";

/** Orange from 24h, red from 72h. */
export function statusAge(hours: number): StatusAge {
	if (hours >= 72) return "stale";
	if (hours >= 24) return "aging";
	return "normal";
}

/** Severity ascending (SEV-1 first), then oldest filed first within a tier. */
export function sortTicketsForQueue(tickets: Ticket[]): Ticket[] {
	return [...tickets].sort(
		(a, b) =>
			SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
			new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
	);
}

const WEEK_HOURS = 7 * 24;

/** Statuses where someone is actively working the ticket. */
const IN_PROGRESS_STATUSES: Ticket["status"][] = [
	"IN_PROGRESS",
	"PR_OPEN",
	"IN_REVIEW",
];
const NEEDS_ATTENTION_STATUSES: Ticket["status"][] = ["FAILED", "NEEDS_HUMAN"];

export function isUnassigned(ticket: Ticket): boolean {
	return !ticket.assigneeCaalmUserId && !ticket.assigneeGithubLogin;
}

/** Hours since the ticket was filed. */
export function ageHours(ticket: Ticket, now = Date.now()): number {
	return Math.max(0, now - new Date(ticket.submittedAt).getTime()) / 3_600_000;
}

export type QueueStats = {
	active: number;
	critical: number;
	high: number;
	/** Active tickets filed in the last 7 days. */
	newThisWeek: number;
	help: number;
	engineering: number;
	inProgress: number;
	needsAttention: number;
	unassigned: number;
	/** Still OPEN after more than 24h. */
	openOver24h: number;
	/** SEV-1 / SEV-2 tickets, longest waiting in status first. */
	criticalTickets: Ticket[];
	highTickets: Ticket[];
	/** Longest-open active ticket (by when it was filed). */
	oldest: Ticket | null;
	/** Mean age of the active tickets, in days. */
	avgAgeDays: number;
};

export function computeQueueStats(
	tickets: Ticket[],
	now = Date.now(),
): QueueStats {
	let oldest: Ticket | null = null;
	let oldestAge = -1;
	let ageTotal = 0;
	for (const ticket of tickets) {
		const age = ageHours(ticket, now);
		ageTotal += age;
		if (age > oldestAge) {
			oldest = ticket;
			oldestAge = age;
		}
	}
	const waitingLongest = (severity: TicketSeverity) =>
		tickets
			.filter((t) => t.severity === severity)
			.sort((a, b) => hoursInStatus(b, now) - hoursInStatus(a, now));
	const criticalTickets = waitingLongest("critical");
	const highTickets = waitingLongest("high");
	return {
		active: tickets.length,
		critical: criticalTickets.length,
		high: highTickets.length,
		newThisWeek: tickets.filter((t) => ageHours(t, now) <= WEEK_HOURS).length,
		help: tickets.filter((t) => t.lane === "help").length,
		engineering: tickets.filter((t) => t.lane !== "help").length,
		inProgress: tickets.filter((t) => IN_PROGRESS_STATUSES.includes(t.status))
			.length,
		needsAttention: tickets.filter((t) =>
			NEEDS_ATTENTION_STATUSES.includes(t.status),
		).length,
		unassigned: tickets.filter(isUnassigned).length,
		openOver24h: tickets.filter(
			(t) => t.status === "OPEN" && hoursInStatus(t, now) > 24,
		).length,
		criticalTickets,
		highTickets,
		oldest,
		avgAgeDays: tickets.length ? ageTotal / tickets.length / 24 : 0,
	};
}

export type QueueSortKey = "ticket" | "severity" | "age";
export type SortDir = "asc" | "desc";

/** First click direction per column: oldest-waiting first for age, A→Z / SEV-1 first otherwise. */
export const DEFAULT_SORT_DIR: Record<QueueSortKey, SortDir> = {
	ticket: "asc",
	severity: "asc",
	age: "desc",
};

export const QUEUE_PAGE_SIZE = 12;

function bySeverity(a: Ticket, b: Ticket): number {
	return (
		SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
		new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
	);
}

export function sortTicketsBy(
	tickets: Ticket[],
	key: QueueSortKey,
	dir: SortDir,
	now = Date.now(),
): Ticket[] {
	const sign = dir === "asc" ? 1 : -1;
	return [...tickets].sort((a, b) => {
		switch (key) {
			case "severity":
				return sign * bySeverity(a, b);
			case "age":
				return sign * (hoursInStatus(a, now) - hoursInStatus(b, now));
			case "ticket":
				return (
					sign *
					(a.ticketNumber ?? a.$id).localeCompare(
						b.ticketNumber ?? b.$id,
						undefined,
						{
							numeric: true,
						},
					)
				);
		}
	});
}
