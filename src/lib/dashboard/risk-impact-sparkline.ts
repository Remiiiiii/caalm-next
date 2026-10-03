import type {
	RiskImpactPeriod,
	RiskImpactSparkPoint,
} from "@/lib/dashboard/risk-impact.types";

export type TrackingGrain = "week" | "month";

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday-start week, same idea as a fiscal week starting after the weekend. */
export function startOfWeek(date: Date): Date {
	const day = startOfDay(date);
	const weekday = day.getDay();
	const shift = weekday === 0 ? -6 : 1 - weekday;
	day.setDate(day.getDate() + shift);
	return day;
}

export function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function monthLabel(date: Date): string {
	return date.toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function weekLabel(date: Date): string {
	return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function parseEventDate(iso: string): Date | null {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return null;
	return startOfDay(parsed);
}

/**
 * Build a cumulative tracking series.
 * Year-to-date uses weeks through Dec 31 so JAN–DEC stays on the chart.
 * Month and quarter use the same week buckets within their window.
 */
export function buildRiskTrackingSeries(
	period: RiskImpactPeriod,
	start: Date,
	eventDates: string[],
	now: Date = new Date(),
): RiskImpactSparkPoint[] {
	const today = startOfDay(now);
	const buckets: {
		key: string;
		date: Date;
		label: string;
		month: string;
		count: number;
	}[] = [];

	if (period === "last30") {
		for (let i = 30; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(today.getDate() - i);
			buckets.push({
				key: toDateKey(date),
				date,
				label: weekLabel(date),
				month: monthLabel(date),
				count: 0,
			});
		}
		for (const iso of eventDates) {
			const eventDay = parseEventDate(iso);
			if (!eventDay) continue;
			const bucket = buckets.find((b) => b.key === toDateKey(eventDay));
			if (bucket) bucket.count += 1;
		}
	} else {
		// Year view runs through Dec 31 so later months stay visible without scrolling.
		const seriesEnd =
			period === "ytd"
				? new Date(today.getFullYear(), 11, 31)
				: today;
		const cursor = startOfWeek(start);
		while (cursor <= seriesEnd) {
			const date = new Date(cursor);
			buckets.push({
				key: toDateKey(date),
				date,
				label: weekLabel(date),
				month: monthLabel(date),
				count: 0,
			});
			cursor.setDate(cursor.getDate() + 7);
		}
		for (const iso of eventDates) {
			const eventDay = parseEventDate(iso);
			if (!eventDay) continue;
			const key = toDateKey(startOfWeek(eventDay));
			const bucket = buckets.find((b) => b.key === key);
			if (bucket) bucket.count += 1;
		}
	}

	const periodStartDay = startOfDay(start);
	let cumulative = 0;
	return buckets.map((bucket) => {
		cumulative += bucket.count;
		// Monday-start weeks can begin in December; keep those points in the period month.
		const displayDate =
			bucket.date < periodStartDay ? periodStartDay : bucket.date;
		return {
			label: bucket.label,
			value: cumulative,
			date: toDateKey(displayDate),
			increment: bucket.count,
			month: monthLabel(displayDate),
		};
	});
}

/**
 * Demo activity dates so the tracking chart can show a wave:
 * up/down through spring, then a climb from June through September.
 * Chart-only — not counted toward risk-averted dollars.
 */
export const DEMO_RISK_TRACKING_DATES = [
	"2026-01-08T15:00:00.000Z",
	"2026-01-09T15:00:00.000Z",
	"2026-01-10T15:00:00.000Z",
	"2026-02-11T15:00:00.000Z",
	"2026-03-11T15:00:00.000Z",
	"2026-03-12T15:00:00.000Z",
	"2026-03-13T15:00:00.000Z",
	"2026-03-14T15:00:00.000Z",
	"2026-04-08T15:00:00.000Z",
	"2026-04-09T15:00:00.000Z",
	"2026-05-13T15:00:00.000Z",
	"2026-06-10T15:00:00.000Z",
	"2026-06-11T15:00:00.000Z",
	"2026-07-15T15:00:00.000Z",
	"2026-07-16T15:00:00.000Z",
	"2026-07-17T15:00:00.000Z",
	"2026-08-19T15:00:00.000Z",
	"2026-08-20T15:00:00.000Z",
	"2026-08-21T15:00:00.000Z",
	"2026-08-26T15:00:00.000Z",
	"2026-08-27T15:00:00.000Z",
	"2026-09-09T15:00:00.000Z",
	"2026-09-10T15:00:00.000Z",
	"2026-09-16T15:00:00.000Z",
	"2026-09-17T15:00:00.000Z",
	"2026-09-18T15:00:00.000Z",
];

export function mergeTrackingEventDates(
	eventDates: string[],
	start: Date,
): string[] {
	const extra = DEMO_RISK_TRACKING_DATES.filter((iso) => {
		const parsed = new Date(iso);
		return !Number.isNaN(parsed.getTime()) && parsed >= start;
	});
	return [...eventDates, ...extra];
}

/** Roll weekly/daily points into one point per calendar month for the Month grain. */
export function rollupTrackingMonths(
	points: RiskImpactSparkPoint[],
): RiskImpactSparkPoint[] {
	const months = new Map<string, RiskImpactSparkPoint>();

	for (const point of points) {
		const dateKey = point.date || point.label;
		const monthKey = dateKey.slice(0, 7);
		const increment = point.increment ?? 0;
		const existing = months.get(monthKey);

		if (!existing) {
			months.set(monthKey, {
				label: point.month || point.label,
				value: point.value,
				date: dateKey,
				increment,
				month: point.month || point.label,
			});
			continue;
		}

		existing.increment = (existing.increment ?? 0) + increment;
		existing.value = point.value;
		existing.date = dateKey;
	}

	return [...months.values()];
}

/**
 * Ensure JAN–DEC of `year` appear on the month chart, even when later months
 * have no events yet (empty buckets keep the last cumulative total).
 */
export function padYearMonths(
	points: RiskImpactSparkPoint[],
	year: number,
): RiskImpactSparkPoint[] {
	const byKey = new Map(
		rollupTrackingMonths(points).map((point) => [
			(point.date || "").slice(0, 7),
			point,
		]),
	);
	const padded: RiskImpactSparkPoint[] = [];
	let lastValue = 0;

	for (let month = 0; month < 12; month++) {
		const key = `${year}-${String(month + 1).padStart(2, "0")}`;
		const existing = byKey.get(key);
		if (existing) {
			lastValue = existing.value;
			padded.push(existing);
			continue;
		}
		const date = new Date(year, month, 1);
		padded.push({
			label: monthLabel(date),
			value: lastValue,
			date: toDateKey(date),
			increment: 0,
			month: monthLabel(date),
		});
	}

	return padded;
}

/**
 * Ensure every week from Jan through Dec of `year` appears on the week chart.
 * Missing future weeks keep the last cumulative total with 0 new events.
 */
export function padYearWeeks(
	points: RiskImpactSparkPoint[],
	year: number,
): RiskImpactSparkPoint[] {
	const yearStart = new Date(year, 0, 1);
	const yearEnd = new Date(year, 11, 31);
	const byKey = new Map<string, RiskImpactSparkPoint>();

	for (const point of points) {
		if (!point.date) continue;
		const [y, m, d] = point.date.split("-").map(Number);
		if (!y || !m) continue;
		const weekKey = toDateKey(startOfWeek(new Date(y, m - 1, d || 1)));
		byKey.set(weekKey, point);
	}

	const padded: RiskImpactSparkPoint[] = [];
	let lastValue = 0;
	const cursor = startOfWeek(yearStart);

	while (cursor <= yearEnd) {
		const key = toDateKey(cursor);
		const existing = byKey.get(key);
		const displayDate = cursor < yearStart ? yearStart : new Date(cursor);

		if (existing) {
			lastValue = existing.value;
			padded.push({
				...existing,
				date: toDateKey(displayDate),
				month: monthLabel(displayDate),
			});
		} else {
			padded.push({
				label: weekLabel(displayDate),
				value: lastValue,
				date: toDateKey(displayDate),
				increment: 0,
				month: monthLabel(displayDate),
			});
		}

		cursor.setDate(cursor.getDate() + 7);
	}

	return padded;
}
