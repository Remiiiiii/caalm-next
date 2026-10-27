import { describe, expect, it } from "vitest";
import type { Ticket, TicketSeverity } from "./ticket.types";
import {
	computeQueueStats,
	severityLevelNumber,
	sortTicketsBy,
	sortTicketsForQueue,
	statusAge,
} from "./ticket-queue";

const NOW = new Date("2026-10-27T12:00:00Z").getTime();

function ticket(
	id: string,
	severity: TicketSeverity,
	submittedAt: string,
	updatedAt?: string,
): Ticket {
	return {
		$id: id,
		title: id,
		description: "",
		submittedByUserId: "u",
		submittedByName: "U",
		department: "IT",
		submittedAt,
		severity,
		status: "OPEN",
		orgId: "o",
		$updatedAt: updatedAt,
	};
}

describe("ticket queue", () => {
	it("sorts SEV-1 first, then oldest filed within a tier", () => {
		const sorted = sortTicketsForQueue([
			ticket("low-old", "low", "2026-01-01T00:00:00Z"),
			ticket("high-new", "high", "2026-10-01T00:00:00Z"),
			ticket("crit", "critical", "2026-10-20T00:00:00Z"),
			ticket("high-old", "high", "2026-09-01T00:00:00Z"),
		]);
		expect(sorted.map((t) => t.$id)).toEqual([
			"crit",
			"high-old",
			"high-new",
			"low-old",
		]);
	});

	it("maps severity to SEV levels", () => {
		expect(severityLevelNumber("critical")).toBe(1);
		expect(severityLevelNumber("low")).toBe(4);
	});

	it("turns orange at 24h and red at 72h", () => {
		expect(statusAge(23.9)).toBe("normal");
		expect(statusAge(24)).toBe("aging");
		expect(statusAge(72)).toBe("stale");
	});

	it("counts severities and finds the longest-waiting ticket", () => {
		const stats = computeQueueStats(
			[
				ticket("a", "critical", "2026-10-27T09:00:00Z"),
				ticket("b", "high", "2026-10-26T00:00:00Z"),
				ticket("c", "high", "2026-08-01T00:00:00Z"),
			],
			NOW,
		);
		expect(stats).toMatchObject({ active: 3, critical: 1, high: 2 });
		expect(stats.oldest?.$id).toBe("c");
	});
});

describe("queue column sorting", () => {
	const rows = [
		{
			...ticket("a", "low", "2026-10-01T00:00:00Z"),
			ticketNumber: "TKT-2026-0010",
		},
		{
			...ticket("b", "critical", "2026-10-02T00:00:00Z"),
			ticketNumber: "TKT-2026-0002",
		},
		{
			...ticket("c", "high", "2026-09-01T00:00:00Z"),
			ticketNumber: "TKT-2026-0003",
		},
	];

	it("sorts ticket numbers naturally", () => {
		expect(sortTicketsBy(rows, "ticket", "asc").map((t) => t.$id)).toEqual([
			"b",
			"c",
			"a",
		]);
	});

	it("reverses severity and puts the longest-waiting first for age desc", () => {
		expect(sortTicketsBy(rows, "severity", "desc")[0].$id).toBe("a");
		expect(sortTicketsBy(rows, "age", "desc", NOW)[0].$id).toBe("c");
	});
});
