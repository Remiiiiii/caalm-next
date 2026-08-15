import { DEFAULT_ORG_TIMEZONE, type AuditCadence } from "./types";

export function resolveOrgTimezone(timezone?: string | null): string {
	if (timezone && isValidIanaTimezone(timezone)) return timezone;
	return DEFAULT_ORG_TIMEZONE;
}

export function isValidIanaTimezone(timezone: string): boolean {
	try {
		Intl.DateTimeFormat(undefined, { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}

function zonedParts(date: Date, timeZone: string) {
	const fmt = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	const parts = fmt.formatToParts(date);
	const get = (type: string) =>
		parts.find((part) => part.type === type)?.value ?? "";
	return {
		weekday: get("weekday"),
		year: Number(get("year")),
		month: Number(get("month")),
		day: Number(get("day")),
		hour: Number(get("hour")),
		minute: Number(get("minute")),
	};
}

/** Local calendar day key YYYY-MM-DD in org timezone */
export function localDayKey(date: Date, timeZone: string): string {
	const p = zonedParts(date, timeZone);
	return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * Hourly cron window: fire when local time is in [09:00, 09:59].
 * Weekly = Monday; monthly = day 1; quarterly = Jan/Apr/Jul/Oct day 1.
 */
export function cadencesDueNow(
	date: Date,
	timeZone: string,
): AuditCadence[] {
	const p = zonedParts(date, timeZone);
	if (p.hour !== 9) return [];

	const due: AuditCadence[] = [];
	if (p.weekday === "Mon") due.push("weekly");
	if (p.day === 1) {
		due.push("monthly");
		if ([1, 4, 7, 10].includes(p.month)) due.push("quarterly");
	}
	return due;
}
