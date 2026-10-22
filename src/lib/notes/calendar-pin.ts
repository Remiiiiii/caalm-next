const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export type CalendarPinFields = {
	calendarDate?: string | null;
	calendarTime?: string | null;
};

export type ValidatedCalendarPin =
	| { pinned: false; calendarDate: null; calendarTime: null }
	| { pinned: true; calendarDate: string; calendarTime: string };

export function isCalendarDate(value: string): boolean {
	if (!DATE_RE.test(value)) return false;
	const [year, month, day] = value.split("-").map(Number);
	const parsed = new Date(year, month - 1, day);
	return (
		parsed.getFullYear() === year &&
		parsed.getMonth() === month - 1 &&
		parsed.getDate() === day
	);
}

export function isCalendarTime(value: string): boolean {
	if (!TIME_RE.test(value)) return false;
	const [hours, minutes] = value.split(":").map(Number);
	return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/** Pin requires both date and time, or neither. */
export function validateCalendarPin(
	fields: CalendarPinFields,
): ValidatedCalendarPin {
	const date = fields.calendarDate?.trim() || "";
	const time = fields.calendarTime?.trim() || "";

	if (!date && !time) {
		return { pinned: false, calendarDate: null, calendarTime: null };
	}

	if (!date || !time) {
		throw new Error("Calendar pin needs both a date and a time");
	}

	if (!isCalendarDate(date)) {
		throw new Error("Calendar date must be YYYY-MM-DD");
	}

	if (!isCalendarTime(time)) {
		throw new Error("Calendar time must be HH:mm");
	}

	return { pinned: true, calendarDate: date, calendarTime: time };
}

export function monthDateRange(
	year: number,
	month: number,
): { start: string; end: string } {
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		month < 1 ||
		month > 12
	) {
		throw new Error("Month must be 1–12");
	}
	const lastDay = new Date(year, month, 0).getDate();
	const mm = String(month).padStart(2, "0");
	return {
		start: `${year}-${mm}-01`,
		end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
	};
}
