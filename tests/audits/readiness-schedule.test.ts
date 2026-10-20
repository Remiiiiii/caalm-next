import { describe, expect, it } from "vitest";
import { nextScheduledReadinessRun } from "@/lib/audits/readiness/schedule";

describe("nextScheduledReadinessRun", () => {
	it("returns the next Monday run when mid-week", () => {
		// Wed Oct 21 2026 -> next Monday is Oct 26
		const next = nextScheduledReadinessRun(
			new Date("2026-10-21T15:00:00Z"),
			"America/New_York",
		);
		expect(next?.at).toBe("2026-10-26T13:00:00.000Z");
		expect(next?.cadences).toContain("weekly");
	});

	it("skips a cron run that already happened today", () => {
		// Mon Oct 19 2026 after the 13:00 UTC run -> next is Mon Oct 26
		const next = nextScheduledReadinessRun(
			new Date("2026-10-19T20:00:00Z"),
			"America/New_York",
		);
		expect(next?.at).toBe("2026-10-26T13:00:00.000Z");
	});

	it("uses today's run when it has not fired yet", () => {
		const next = nextScheduledReadinessRun(
			new Date("2026-10-19T08:00:00Z"),
			"America/New_York",
		);
		expect(next?.at).toBe("2026-10-19T13:00:00.000Z");
	});

	it("includes monthly and quarterly on the first of the quarter", () => {
		// Tue Sep 29 2026 -> Oct 1 is a Thursday: monthly + quarterly
		const next = nextScheduledReadinessRun(
			new Date("2026-09-29T20:00:00Z"),
			"America/New_York",
		);
		expect(next?.at).toBe("2026-10-01T13:00:00.000Z");
		expect(next?.cadences).toEqual(["monthly", "quarterly"]);
	});
});
