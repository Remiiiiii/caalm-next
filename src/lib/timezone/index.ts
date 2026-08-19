import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const DEFAULT_ORG_TIMEZONE = "America/New_York";

export type ScheduleCadence = "weekly" | "monthly" | "quarterly";

export type IanaTimezoneOption = {
	value: string;
	region: string;
	city: string;
	label: string;
};

export function isValidIanaTimezone(timezone: string): boolean {
	try {
		Intl.DateTimeFormat(undefined, { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}

export function resolveOrgTimezone(timezone?: string | null): string {
	if (timezone && isValidIanaTimezone(timezone)) return timezone;
	return DEFAULT_ORG_TIMEZONE;
}

export function zonedParts(date: Date, timeZone: string) {
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

/** Local calendar day key YYYY-MM-DD in the given timezone */
export function localDayKey(date: Date, timeZone: string): string {
	const p = zonedParts(date, timeZone);
	return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function localMonthKey(date: Date, timeZone: string): string {
	const p = zonedParts(date, timeZone);
	return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

/**
 * Hourly cron window: fire when local time is in [09:00, 09:59].
 * Weekly = Monday; monthly = day 1; quarterly = Jan/Apr/Jul/Oct day 1.
 */
export function cadencesDueNow(
	date: Date,
	timeZone: string,
): ScheduleCadence[] {
	const p = zonedParts(date, timeZone);
	if (p.hour !== 9) return [];

	const due: ScheduleCadence[] = [];
	if (p.weekday === "Mon") due.push("weekly");
	if (p.day === 1) {
		due.push("monthly");
		if ([1, 4, 7, 10].includes(p.month)) due.push("quarterly");
	}
	return due;
}

export function isLocalHour(
	date: Date,
	timeZone: string,
	hour: number,
): boolean {
	return zonedParts(date, resolveOrgTimezone(timeZone)).hour === hour;
}

export function zonedWallTimeToUtc(
	parts: {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute?: number;
	},
	timeZone: string,
): Date {
	const y = parts.year;
	const m = String(parts.month).padStart(2, "0");
	const d = String(parts.day).padStart(2, "0");
	const h = String(parts.hour).padStart(2, "0");
	const min = String(parts.minute ?? 0).padStart(2, "0");
	return fromZonedTime(`${y}-${m}-${d}T${h}:${min}:00`, timeZone);
}

/** Next daily/weekly 09:00 in org timezone, returned as a UTC Date. */
export function nextLocalNineAm(
	now: Date,
	timeZone: string,
	frequency: "daily" | "weekly",
): Date {
	const tz = resolveOrgTimezone(timeZone);
	const p = zonedParts(now, tz);

	if (frequency === "weekly") {
		const weekdayIndex: Record<string, number> = {
			Sun: 0,
			Mon: 1,
			Tue: 2,
			Wed: 3,
			Thu: 4,
			Fri: 5,
			Sat: 6,
		};
		const current = weekdayIndex[p.weekday] ?? 0;
		let daysUntilMonday = (8 - current) % 7;
		if (daysUntilMonday === 0) {
			daysUntilMonday = p.hour < 9 ? 0 : 7;
		}
		const target = new Date(
			Date.UTC(p.year, p.month - 1, p.day + daysUntilMonday),
		);
		const t = zonedParts(target, "UTC");
		return zonedWallTimeToUtc(
			{ year: t.year, month: t.month, day: t.day, hour: 9 },
			tz,
		);
	}

	const addDay = p.hour >= 9 ? 1 : 0;
	const target = new Date(Date.UTC(p.year, p.month - 1, p.day + addDay));
	const t = zonedParts(target, "UTC");
	return zonedWallTimeToUtc(
		{ year: t.year, month: t.month, day: t.day, hour: 9 },
		tz,
	);
}

export function formatInTimezone(
	date: Date | string | number,
	pattern: string,
	timeZone?: string | null,
): string {
	const tz = resolveOrgTimezone(timeZone);
	return formatInTimeZone(date, tz, pattern);
}

export function getTimezoneAbbreviation(
	date: Date = new Date(),
	timeZone?: string | null,
): string {
	const tz = resolveOrgTimezone(timeZone);
	const part = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		timeZoneName: "short",
	})
		.formatToParts(date)
		.find((p) => p.type === "timeZoneName")?.value;
	return part || "";
}

export function getTimezoneOffsetLabel(
	timeZone: string,
	date: Date = new Date(),
): string {
	if (!isValidIanaTimezone(timeZone)) return timeZone;
	const part =
		new Intl.DateTimeFormat("en-US", {
			timeZone,
			timeZoneName: "shortOffset",
		})
			.formatToParts(date)
			.find((p) => p.type === "timeZoneName")?.value ?? "";
	const offset = part.replace("GMT", "UTC");
	return offset ? `(${offset}) ${timeZone}` : timeZone;
}

export function listIanaTimezones(): IanaTimezoneOption[] {
	const supported =
		typeof Intl.supportedValuesOf === "function"
			? Intl.supportedValuesOf("timeZone")
			: [
					"UTC",
					"America/New_York",
					"America/Chicago",
					"America/Denver",
					"America/Los_Angeles",
					"Europe/London",
					"Europe/Paris",
					"Asia/Tokyo",
				];

	return supported.map((value) => {
		const [region, ...rest] = value.split("/");
		const city = rest.join("/").replace(/_/g, " ") || value;
		return {
			value,
			region: region || "Other",
			city,
			label: getTimezoneOffsetLabel(value),
		};
	});
}

/** Calendar-day difference between YYYY-MM-DD keys (expiry minus today). */
export function calendarDaysBetween(
	todayKey: string,
	expiryKey: string,
): number {
	const [ty, tm, td] = todayKey.split("-").map(Number);
	const [ey, em, ed] = expiryKey.split("-").map(Number);
	if (!ty || !tm || !td || !ey || !em || !ed) return Number.NaN;
	const todayUtc = Date.UTC(ty, tm - 1, td);
	const expiryUtc = Date.UTC(ey, em - 1, ed);
	return Math.floor((expiryUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

export function daysUntilDateOnly(
	expiryRaw: string,
	now: Date,
	timeZone: string,
): number {
	const expiryKey = expiryRaw.split("T")[0];
	if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryKey)) return Number.NaN;
	return calendarDaysBetween(
		localDayKey(now, resolveOrgTimezone(timeZone)),
		expiryKey,
	);
}
