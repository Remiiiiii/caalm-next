import { describe, expect, it } from "vitest";
import {
	buildRiskTrackingSeries,
	DEMO_RISK_TRACKING_DATES,
	rollupTrackingMonths,
	startOfWeek,
	toDateKey,
} from "@/lib/dashboard/risk-impact-sparkline";

describe("buildRiskTrackingSeries", () => {
	it("uses weekly buckets for year to date instead of one point per month", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries("ytd", start, [], now);

		expect(series.length).toBeGreaterThan(9);
		expect(series[0]?.date).toBe(toDateKey(start));
		expect(series.at(-1)?.date).toBe(toDateKey(startOfWeek(now)));
	});

	it("counts an event on the week it landed, then carries the total forward", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries(
			"ytd",
			start,
			["2026-09-16T15:00:00.000Z"],
			now,
		);

		const hit = series.find((point) => (point.increment ?? 0) > 0);
		expect(hit?.increment).toBe(1);
		expect(series.at(-1)?.value).toBe(1);
	});

	it("rolls weeks into months without losing event counts", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries(
			"ytd",
			start,
			["2026-01-08T12:00:00.000Z", "2026-09-16T12:00:00.000Z"],
			now,
		);
		const months = rollupTrackingMonths(series);

		expect(months.length).toBeLessThan(series.length);
		expect(months.reduce((sum, p) => sum + (p.increment ?? 0), 0)).toBe(2);
		expect(months.at(-1)?.value).toBe(2);
	});

	it("shows a spring dip then a June-to-September climb on demo dates", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries(
			"ytd",
			start,
			DEMO_RISK_TRACKING_DATES,
			now,
		);
		const months = rollupTrackingMonths(series);
		const byMonth = Object.fromEntries(
			months.map((point) => [point.month, point.increment ?? 0]),
		);

		expect(Object.keys(byMonth)).toEqual(
			expect.arrayContaining(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP"]),
		);
		expect(byMonth.FEB).toBeLessThan(byMonth.JAN);
		expect(byMonth.MAY).toBeLessThan(byMonth.MAR);
		expect(byMonth.JUN).toBeLessThan(byMonth.JUL);
		expect(byMonth.JUL).toBeLessThan(byMonth.AUG);
		expect(byMonth.AUG).toBeLessThanOrEqual(byMonth.SEP);
	});
});
