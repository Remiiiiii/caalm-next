import { describe, expect, it } from "vitest";
import {
	buildRiskTrackingSeries,
	DEMO_RISK_TRACKING_DATES,
	padYearMonths,
	padYearWeeks,
	rollupTrackingMonths,
	toDateKey,
} from "@/lib/dashboard/risk-impact-sparkline";

describe("buildRiskTrackingSeries", () => {
	it("uses weekly buckets for year to date instead of one point per month", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries("ytd", start, [], now);

		expect(series.length).toBeGreaterThan(9);
		expect(series[0]?.date).toBe(toDateKey(start));
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

	it("pads year-to-date weeks through December so JAN–DEC stay on the chart", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries("ytd", start, [], now);
		const last = series.at(-1);
		expect(last?.date?.startsWith("2026-12")).toBe(true);
	});

	it("pads month rollup to twelve calendar months for the year view", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries(
			"ytd",
			start,
			["2026-01-08T12:00:00.000Z", "2026-09-16T12:00:00.000Z"],
			now,
		);
		const months = padYearMonths(series, 2026);
		expect(months.map((point) => point.month)).toEqual([
			"JAN",
			"FEB",
			"MAR",
			"APR",
			"MAY",
			"JUN",
			"JUL",
			"AUG",
			"SEP",
			"OCT",
			"NOV",
			"DEC",
		]);
		expect(months.at(-1)?.value).toBe(2);
		expect(months.at(-1)?.increment).toBe(0);
	});

	it("pads week series through December for the year week view", () => {
		const now = new Date(2026, 2, 15);
		const start = new Date(2026, 0, 1);
		const series = buildRiskTrackingSeries(
			"ytd",
			start,
			["2026-01-08T12:00:00.000Z"],
			now,
		);
		// Truncate like an older client payload that only had weeks through "now".
		const truncated = series.filter((point) => (point.date || "") <= "2026-03-31");
		const weeks = padYearWeeks(truncated, 2026);
		expect(weeks[0]?.month).toBe("JAN");
		expect(weeks.at(-1)?.date?.startsWith("2026-12")).toBe(true);
		expect(weeks.at(-1)?.value).toBe(1);
		expect(weeks.at(-1)?.increment).toBe(0);
		const monthsSeen = [...new Set(weeks.map((point) => point.month))];
		expect(monthsSeen).toEqual([
			"JAN",
			"FEB",
			"MAR",
			"APR",
			"MAY",
			"JUN",
			"JUL",
			"AUG",
			"SEP",
			"OCT",
			"NOV",
			"DEC",
		]);
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
			expect.arrayContaining([
				"JAN",
				"FEB",
				"MAR",
				"APR",
				"MAY",
				"JUN",
				"JUL",
				"AUG",
				"SEP",
			]),
		);
		expect(byMonth.FEB).toBeLessThan(byMonth.JAN);
		expect(byMonth.MAY).toBeLessThan(byMonth.MAR);
		expect(byMonth.JUN).toBeLessThan(byMonth.JUL);
		expect(byMonth.JUL).toBeLessThan(byMonth.AUG);
		expect(byMonth.AUG).toBeLessThanOrEqual(byMonth.SEP);
	});
});
