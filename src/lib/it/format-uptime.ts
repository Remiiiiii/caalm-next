/**
 * Format a process uptime in seconds into a plain human duration.
 * Uses fixed length units (30-day months, 365-day years) — good enough for process age.
 */
export function formatUptime(totalSeconds: number): string {
	const sec = Math.max(0, Math.floor(totalSeconds));
	if (sec === 0) return "0 sec";

	const years = Math.floor(sec / (365 * 24 * 60 * 60));
	let rem = sec % (365 * 24 * 60 * 60);
	const months = Math.floor(rem / (30 * 24 * 60 * 60));
	rem %= 30 * 24 * 60 * 60;
	const weeks = Math.floor(rem / (7 * 24 * 60 * 60));
	rem %= 7 * 24 * 60 * 60;
	const days = Math.floor(rem / (24 * 60 * 60));
	rem %= 24 * 60 * 60;
	const hours = Math.floor(rem / (60 * 60));
	rem %= 60 * 60;
	const minutes = Math.floor(rem / 60);
	const seconds = rem % 60;

	const parts: string[] = [];
	if (years) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
	if (months) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
	if (weeks) parts.push(`${weeks} ${weeks === 1 ? "week" : "weeks"}`);
	if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
	if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
	if (minutes) parts.push(`${minutes} min`);
	if (seconds || parts.length === 0) {
		parts.push(`${seconds} sec`);
	}

	return parts.join(" ");
}
