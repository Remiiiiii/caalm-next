/**
 * Build structured recent-activity feed for the assistant UI card.
 */

export type ActivityFeedKind = "schedule" | "feedback" | "task";

export type ActivityFeedItem = {
	id: string;
	kind: ActivityFeedKind;
	verb: string;
	detail?: string;
	who?: string;
	whenLabel: string;
	count?: number;
};

export type ActivityFeedDay = {
	label: string;
	items: ActivityFeedItem[];
};

export type ActivityFeedPayload = {
	title: string;
	days: ActivityFeedDay[];
};

function startOfLocalDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDayLabel(when: Date, now = new Date()): string {
	const day = startOfLocalDay(when);
	const today = startOfLocalDay(now);
	const diffDays = Math.round(
		(today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000),
	);
	const short = when.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
	if (diffDays === 0) return `Today · ${short}`;
	if (diffDays === 1) return `Yesterday · ${short}`;
	return short;
}

function formatWhenMeta(when: Date, kind: ActivityFeedKind): string {
	const date = when.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	if (kind === "feedback") return date;
	return `Due ${date}`;
}

function classifyKind(title: string, action?: string, module?: string): ActivityFeedKind {
	const blob = `${title} ${action ?? ""} ${module ?? ""}`.toLowerCase();
	if (blob.includes("feedback") || blob.includes("helpful")) return "feedback";
	if (
		blob.includes("schedul") ||
		blob.includes("calendar") ||
		blob.includes("meeting") ||
		blob.includes("event")
	) {
		return "schedule";
	}
	return "task";
}

function parseVerbAndDetail(title: string): { verb: string; detail?: string } {
	const cleaned = title.trim();
	const colon = cleaned.indexOf(":");
	if (colon > 0) {
		let verb = cleaned.slice(0, colon).trim();
		const detail = cleaned.slice(colon + 1).trim();
		verb = verb
			.replace(/^Assistant scheduled event$/i, "Assistant scheduled")
			.replace(/^Assistant cancelled event$/i, "Assistant cancelled")
			.replace(/^Assistant completed task$/i, "Task updated")
			.replace(/^Assistant created task$/i, "Task created")
			.replace(/^Assistant feedback$/i, "Assistant feedback");
		return { verb, detail: detail || undefined };
	}
	if (/^Assistant feedback/i.test(cleaned)) {
		const rest = cleaned.replace(/^Assistant feedback[:\s]*/i, "").trim();
		if (rest === "up") {
			return { verb: "Assistant feedback", detail: "marked helpful" };
		}
		if (rest === "down") {
			return { verb: "Assistant feedback", detail: "marked not helpful" };
		}
		return {
			verb: "Assistant feedback",
			detail: rest || undefined,
		};
	}
	return { verb: cleaned };
}

type RawLog = {
	title?: unknown;
	action?: unknown;
	user?: unknown;
	when?: unknown;
	module?: unknown;
	status?: unknown;
};

/**
 * Turn list_audit_logs result into a day-grouped feed for the redesign card.
 */
export function buildActivityFeed(data: unknown): ActivityFeedPayload | null {
	if (!data || typeof data !== "object") return null;
	const logs = (data as { logs?: unknown }).logs;
	if (!Array.isArray(logs) || logs.length === 0) return null;

	const now = new Date();
	const items: Array<ActivityFeedItem & { sortKey: number; dayKey: string }> =
		[];

	logs.forEach((raw, index) => {
		const l = raw as RawLog;
		const title = String(l.title ?? "Event").trim();
		if (!title) return;
		const whenRaw = l.when ? String(l.when) : "";
		const when = whenRaw ? new Date(whenRaw) : now;
		const validWhen = Number.isNaN(when.getTime()) ? now : when;
		const kind = classifyKind(
			title,
			l.action ? String(l.action) : undefined,
			l.module ? String(l.module) : undefined,
		);
		const { verb, detail } = parseVerbAndDetail(title);
		const who = l.user ? String(l.user).trim() : undefined;
		const dayKey = startOfLocalDay(validWhen).toISOString();
		items.push({
			id: `activity-${index}-${validWhen.getTime()}`,
			kind,
			verb,
			detail,
			who: who || undefined,
			whenLabel: formatWhenMeta(validWhen, kind),
			sortKey: validWhen.getTime(),
			dayKey,
		});
	});

	if (!items.length) return null;

	// Collapse consecutive identical verb+detail+who into a count badge
	const collapsed: typeof items = [];
	for (const item of items) {
		const prev = collapsed[collapsed.length - 1];
		if (
			prev &&
			prev.verb === item.verb &&
			prev.detail === item.detail &&
			prev.who === item.who &&
			prev.dayKey === item.dayKey
		) {
			prev.count = (prev.count ?? 1) + 1;
			continue;
		}
		collapsed.push({ ...item, count: undefined });
	}

	const byDay = new Map<string, ActivityFeedDay>();
	for (const item of collapsed) {
		const when = new Date(item.sortKey);
		const label = formatDayLabel(when, now);
		let day = byDay.get(item.dayKey);
		if (!day) {
			day = { label, items: [] };
			byDay.set(item.dayKey, day);
		}
		day.items.push({
			id: item.id,
			kind: item.kind,
			verb: item.verb,
			detail: item.detail,
			who: item.who,
			whenLabel: item.whenLabel,
			count: item.count,
		});
	}

	const days = [...byDay.entries()]
		.sort((a, b) => (a[0] < b[0] ? 1 : -1))
		.map(([, day]) => day);

	return {
		title: "Here's the recent activity",
		days,
	};
}
