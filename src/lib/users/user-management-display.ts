export function formatUserDateTimeLabel(iso?: string): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterdayStart = new Date(todayStart);
	yesterdayStart.setDate(todayStart.getDate() - 1);
	const tomorrowStart = new Date(todayStart);
	tomorrowStart.setDate(todayStart.getDate() + 1);

	const timeLabel = date.toLocaleString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	if (date >= todayStart && date < tomorrowStart) {
		return `Today at ${timeLabel}`;
	}
	if (date >= yesterdayStart && date < todayStart) {
		return `Yesterday at ${timeLabel}`;
	}

	const dateLabel = date.toLocaleDateString("en-US", {
		month: "short",
		day: "2-digit",
		year: "numeric",
	});

	return `${dateLabel} at ${timeLabel}`;
}

export function formatUserLastActiveLabel(iso?: string): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";

	const diffDays = Math.floor(
		(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diffDays <= 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 30) return `${diffDays} days ago`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
