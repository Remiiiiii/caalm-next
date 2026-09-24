import type {
	RiskImpactPeriod,
	RiskImpactTrend,
} from "@/lib/dashboard/risk-impact.types";

export type { RiskImpactTrend } from "@/lib/dashboard/risk-impact.types";

export function shiftYears(date: Date, years: number): Date {
	const next = new Date(date);
	next.setFullYear(next.getFullYear() + years);
	return next;
}

export function calendarQuarterStart(date: Date): Date {
	const quarter = Math.floor(date.getMonth() / 3);
	return new Date(date.getFullYear(), quarter * 3, 1);
}

export function previousQuarterRange(now: Date): {
	currentStart: Date;
	priorStart: Date;
	priorEnd: Date;
	vsLabel: string;
} {
	const currentStart = calendarQuarterStart(now);
	const priorStart = new Date(
		currentStart.getFullYear(),
		currentStart.getMonth() - 3,
		1,
	);
	const priorQuarter = Math.floor(priorStart.getMonth() / 3) + 1;
	return {
		currentStart,
		priorStart,
		priorEnd: currentStart,
		vsLabel: `Q${priorQuarter}`,
	};
}

export function priorYearWindow(
	period: RiskImpactPeriod,
	periodStart: Date,
	now: Date,
): { start: Date; end: Date; vsLabel: string } {
	const year = now.getFullYear();
	return {
		start: shiftYears(periodStart, -1),
		end: shiftYears(now, -1),
		vsLabel: period === "ytd" ? `${year - 1} YTD` : "prior year",
	};
}

export function inRange(at: Date, start: Date, end: Date): boolean {
	return at >= start && at < end;
}

export function buildTrend(
	current: number,
	prior: number,
	vsLabel: string,
): RiskImpactTrend {
	if (prior === 0 && current === 0) {
		return { direction: "flat", percent: 0, vsLabel, current, prior };
	}
	if (prior === 0 && current > 0) {
		return { direction: "new", percent: null, vsLabel, current, prior };
	}
	const percent = Math.round(((current - prior) / prior) * 100);
	if (percent === 0) {
		return { direction: "flat", percent: 0, vsLabel, current, prior };
	}
	if (percent > 0) {
		return { direction: "up", percent, vsLabel, current, prior };
	}
	return {
		direction: "down",
		percent: Math.abs(percent),
		vsLabel,
		current,
		prior,
	};
}

/** Pill copy: "↑ 18% vs 2025 YTD" */
export function formatYoyBadge(trend: RiskImpactTrend): string {
	if (trend.direction === "new") {
		return `↑ vs ${trend.vsLabel}`;
	}
	if (trend.direction === "down") {
		return `↓ ${trend.percent}% vs ${trend.vsLabel}`;
	}
	if (trend.direction === "up") {
		return `↑ ${trend.percent}% vs ${trend.vsLabel}`;
	}
	return `0% vs ${trend.vsLabel}`;
}

/** Inline count delta: "↑ vs 1 last Q" */
export function formatCountDelta(trend: RiskImpactTrend): string {
	const prior = trend.prior ?? 0;
	if (trend.direction === "flat") {
		return "— vs last Q";
	}
	if (trend.direction === "down") {
		return `↓ vs ${prior} last Q`;
	}
	return `↑ vs ${prior} last Q`;
}

export function earliestDate(...dates: Date[]): Date {
	return dates.reduce((min, date) => (date < min ? date : min));
}
