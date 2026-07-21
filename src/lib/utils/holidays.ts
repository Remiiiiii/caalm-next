import Holidays from "date-holidays";

export interface USHoliday {
	/** Calendar date as YYYY-MM-DD (timezone-safe; no time component) */
	date: string;
	name: string;
	type: string;
}

/**
 * Parse a holiday date string into a local Date at midnight.
 * Accepts YYYY-MM-DD or ISO datetime strings.
 */
export function parseHolidayDate(dateStr: string | Date): Date {
	if (dateStr instanceof Date) {
		return new Date(
			dateStr.getFullYear(),
			dateStr.getMonth(),
			dateStr.getDate(),
		);
	}

	const dateOnly = dateStr.includes("T")
		? dateStr.split("T")[0]
		: dateStr.includes(" ")
			? dateStr.split(" ")[0]
			: dateStr;

	const [year, month, day] = dateOnly.split("-").map(Number);
	return new Date(year, month - 1, day);
}

/**
 * Format a Date as YYYY-MM-DD in local time
 */
function toDateOnlyString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Get US federal holidays for a given year
 */
export function getUSHolidays(year: number): USHoliday[] {
	const hd = new Holidays("US");
	const holidays = hd.getHolidays(year);

	return holidays.map((holiday) => {
		const localDate = parseHolidayDate(holiday.date);
		return {
			date: toDateOnlyString(localDate),
			name: holiday.name,
			type: holiday.type || "public",
		};
	});
}

/**
 * Get US holidays for a specific month (1-12)
 */
export function getUSHolidaysForMonth(
	year: number,
	month: number,
): USHoliday[] {
	const allHolidays = getUSHolidays(year);
	return allHolidays.filter((holiday) => {
		const [, holidayMonth] = holiday.date.split("-").map(Number);
		return holidayMonth === month;
	});
}

/**
 * Check if a date is a US federal holiday
 */
export function isUSHoliday(date: Date): boolean {
	const year = date.getFullYear();
	const holidays = getUSHolidays(year);
	const dateStr = toDateOnlyString(date);

	return holidays.some((holiday) => holiday.date === dateStr);
}
