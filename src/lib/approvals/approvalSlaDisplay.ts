/** Client-safe SLA countdown helpers (no Appwrite imports). */

export function slaCountdownLabel(dueAt?: string, now = new Date()): string {
	if (!dueAt) return "";
	const due = new Date(dueAt).getTime();
	if (Number.isNaN(due)) return "";
	const diffMs = due - now.getTime();
	const absHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
	const days = Math.floor(absHours / 24);
	const hours = absHours % 24;
	const parts = [
		days > 0 ? `${days}d` : null,
		hours > 0 || days === 0 ? `${hours}h` : null,
	].filter(Boolean);
	if (diffMs >= 0) return `Due in ${parts.join(" ")}`;
	return `Overdue by ${parts.join(" ")}`;
}

export function hoursRemaining(
	dueAt?: string,
	now = new Date(),
): number | undefined {
	if (!dueAt) return undefined;
	const due = new Date(dueAt).getTime();
	if (Number.isNaN(due)) return undefined;
	return Math.round((due - now.getTime()) / (1000 * 60 * 60));
}
