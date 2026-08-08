import { format } from "date-fns";

/** Convert 24-hour or 12-hour time strings to display form (e.g. "2:00 PM"). */
export function formatTimeForDisplay(timeInput: string): string {
	if (!timeInput) return "";

	if (timeInput.includes("AM") || timeInput.includes("PM")) {
		return timeInput.replace(/\s+(AM|PM)/i, " $1");
	}

	const [hours, minutes] = timeInput.split(":");
	const hour = parseInt(hours, 10);
	const hours12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
	const ampm = hour >= 12 ? "PM" : "AM";
	return `${hours12}:${minutes} ${ampm}`;
}

export function getTimezoneAbbreviation(date: Date = new Date()): string {
	const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
		.formatToParts(date)
		.find((p) => p.type === "timeZoneName")?.value;
	return part || "";
}

/** Parse time string to minutes since midnight for sorting. */
export function parseTimeToMinutes(timeStr: string | undefined): number {
	if (!timeStr) return 0;

	const twelveHourMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
	if (twelveHourMatch) {
		let hours = parseInt(twelveHourMatch[1], 10);
		const minutes = parseInt(twelveHourMatch[2], 10);
		const period = twelveHourMatch[3].toUpperCase();

		if (period === "PM" && hours !== 12) {
			hours += 12;
		} else if (period === "AM" && hours === 12) {
			hours = 0;
		}

		return hours * 60 + minutes;
	}

	const twentyFourHourMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
	if (twentyFourHourMatch) {
		const hours = parseInt(twentyFourHourMatch[1], 10);
		const minutes = parseInt(twentyFourHourMatch[2], 10);
		return hours * 60 + minutes;
	}

	return 0;
}

export function formatEventDetailDateLine(startDate: Date | string): string {
	const dateObj = startDate instanceof Date ? startDate : new Date(startDate);
	return format(dateObj, "EEEE, MMMM d, yyyy");
}

/** Time range + timezone for event detail card (e.g. "10:00 AM – 10:30 AM EDT"). */
export function formatEventDetailTimeLine(params: {
	startDate: Date | string;
	startTime?: string;
	endTime?: string;
}): string | null {
	if (!params.startTime) return null;
	const dateObj =
		params.startDate instanceof Date
			? params.startDate
			: new Date(params.startDate);
	const start = formatTimeForDisplay(params.startTime);
	const end = params.endTime ? formatTimeForDisplay(params.endTime) : "";
	const tz = getTimezoneAbbreviation(dateObj);
	const timePart = end ? `${start} – ${end}` : start;
	return `${timePart}${tz ? ` ${tz}` : ""}`;
}
