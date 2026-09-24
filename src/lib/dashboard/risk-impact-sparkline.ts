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
 * Year-to-date and 90-day windows use weeks so the graph is not just one point per month.
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
		const cursor = startOfWeek(start);
		while (cursor <= today) {
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
