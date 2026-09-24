import { describe, expect, it } from "vitest";
import {
	buildTrend,
	calendarQuarterStart,
	formatCountDelta,
	formatYoyBadge,
	previousQuarterRange,
	priorYearWindow,
} from "@/lib/dashboard/risk-impact-trends";

describe("buildTrend", () => {
	it("returns an up percent when the current window is larger", () => {
		const trend = buildTrend(118, 100, "2025 YTD");
		expect(trend).toEqual({
			direction: "up",
			percent: 18,
			vsLabel: "2025 YTD",
			current: 118,
			prior: 100,
		});
		expect(formatYoyBadge(trend)).toBe("↑ 18% vs 2025 YTD");
	});

	it("marks a first-time window as new instead of infinity", () => {
		const trend = buildTrend(2, 0, "Q2");
		expect(trend.direction).toBe("new");
		expect(trend.percent).toBeNull();
		expect(formatYoyBadge(trend)).toBe("↑ vs Q2");
		expect(formatCountDelta(trend)).toBe("↑ vs 0 last Q");
	});

	it("returns a down percent when the current window shrinks", () => {
		const trend = buildTrend(80, 100, "Q1");
		expect(trend.direction).toBe("down");
		expect(trend.percent).toBe(20);
		expect(formatYoyBadge(trend)).toBe("↓ 20% vs Q1");
		expect(formatCountDelta(trend)).toBe("↓ vs 100 last Q");
	});

	it("formats a flat count as an em dash vs last Q", () => {
		const trend = buildTrend(1, 1, "Q2");
		expect(formatCountDelta(trend)).toBe("— vs last Q");
	});
});

describe("quarter windows", () => {
	it("treats September as Q3 and compares against Q2", () => {
		const now = new Date(2026, 8, 20);
		expect(calendarQuarterStart(now)).toEqual(new Date(2026, 6, 1));
		const range = previousQuarterRange(now);
		expect(range.priorStart).toEqual(new Date(2026, 3, 1));
		expect(range.priorEnd).toEqual(new Date(2026, 6, 1));
		expect(range.vsLabel).toBe("Q2");
	});
});

describe("priorYearWindow", () => {
	it("labels year-to-date against the previous calendar year", () => {
		const now = new Date(2026, 8, 20);
		const start = new Date(2026, 0, 1);
		const window = priorYearWindow("ytd", start, now);
		expect(window.start).toEqual(new Date(2025, 0, 1));
		expect(window.end).toEqual(new Date(2025, 8, 20));
		expect(window.vsLabel).toBe("2025 YTD");
	});
});
