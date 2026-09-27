export const USER_MANAGEMENT_PAGE_SIZE = 12;

export const USER_ROLE_BADGE_SHAPE =
	"inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-xs rounded-full font-medium border";

const ROLE_BADGE_BY_NAME: Record<string, string> = {
	"super admin": "bg-navy/10 text-navy border-navy/20",
	"organization admin": "bg-blue/10 text-blue border-blue/20",
	executive: "bg-slate-100 text-slate-600 border-slate-200",
	"department manager": "bg-green/10 text-green border-green/20",
	viewer: "bg-purple-600/10 text-purple-600 border-purple-600/20",
	it: "bg-coral-500/10 text-coral-500 border-coral-500/20",
};

const ROLE_BADGE_FALLBACK = [
	"bg-blue/10 text-blue border-blue/20",
	"bg-green/10 text-green border-green/20",
	"bg-pink/10 text-pink border-pink/20",
	"bg-navy/10 text-navy border-navy/20",
	"bg-coral-500/10 text-coral-500 border-coral-500/20",
	"bg-brand/10 text-brand border-brand/20",
];

export function hasAssignedRole(roleName?: string | null): boolean {
	const label = roleName?.trim();
	if (!label) return false;
	return label !== "Unassigned" && label !== "N/A";
}

export function userRoleBadgeClass(roleName?: string | null): string {
	const label = roleName?.trim();
	if (!label || !hasAssignedRole(label)) {
		return "bg-orange/10 text-orange border-orange/20";
	}

	const known = ROLE_BADGE_BY_NAME[label.toLowerCase()];
	if (known) return known;

	let hash = 0;
	for (const char of label) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}
	return ROLE_BADGE_FALLBACK[hash % ROLE_BADGE_FALLBACK.length];
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
	const safePage = Math.max(1, page);
	const start = (safePage - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

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
