/**
 * Pull title / due / priority out of a natural-language "create task" message
 * so the draft card can open pre-filled instead of quizzing the user.
 */

export type CreateTaskDraftArgs = {
	title: string;
	dueDate?: string;
	priority: "low" | "medium" | "high";
	description?: string;
};

function ymd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
	const d = new Date(base);
	d.setDate(d.getDate() + days);
	return d;
}

function nextWeekday(base: Date, weekday: number): Date {
	const d = new Date(base);
	const diff = (weekday - d.getDay() + 7) % 7;
	d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
	return d;
}

const WEEKDAYS: Record<string, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
};

export function parseDueDateFromText(
	message: string,
	now = new Date(),
): string | undefined {
	const q = message.toLowerCase();
	if (/\btoday\b/.test(q)) return ymd(now);
	if (/\btomorrow\b/.test(q)) return ymd(addDays(now, 1));
	if (/\bnext\s+week\b/.test(q)) return ymd(addDays(now, 7));

	for (const [name, day] of Object.entries(WEEKDAYS)) {
		if (new RegExp(`\\b${name}\\b`).test(q)) {
			return ymd(nextWeekday(now, day));
		}
	}

	const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
	if (iso?.[1]) return iso[1];

	const us = message.match(
		/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b/i,
	);
	if (us) {
		const months: Record<string, number> = {
			jan: 0,
			january: 0,
			feb: 1,
			february: 1,
			mar: 2,
			march: 2,
			apr: 3,
			april: 3,
			may: 4,
			jun: 5,
			june: 5,
			jul: 6,
			july: 6,
			aug: 7,
			august: 7,
			sep: 8,
			sept: 8,
			september: 8,
			oct: 9,
			october: 9,
			nov: 10,
			november: 10,
			dec: 11,
			december: 11,
		};
		const mon = months[us[1]!.toLowerCase()];
		const day = Number(us[2]);
		const year = us[3] ? Number(us[3]) : now.getFullYear();
		if (mon !== undefined && day >= 1 && day <= 31) {
			return ymd(new Date(year, mon, day));
		}
	}

	return undefined;
}

export function parsePriorityFromText(
	message: string,
): "low" | "medium" | "high" | undefined {
	const q = message.toLowerCase();
	if (
		/\b(high|urgent|critical)\s*priority\b/.test(q) ||
		/\bpriority\s*:\s*high\b/.test(q)
	) {
		return "high";
	}
	if (/\b(low)\s*priority\b/.test(q) || /\bpriority\s*:\s*low\b/.test(q)) {
		return "low";
	}
	if (
		/\b(medium|normal)\s*priority\b/.test(q) ||
		/\bpriority\s*:\s*medium\b/.test(q)
	) {
		return "medium";
	}
	if (/\bhigh\b/.test(q) && /\b(priority|prio)\b/.test(q)) return "high";
	if (/\blow\b/.test(q) && /\b(priority|prio)\b/.test(q)) return "low";
	return undefined;
}

/**
 * Guess a title from free text after stripping create-task boilerplate.
 * Returns "" when the user only asked to start a draft (no real title yet).
 */
export function parseTaskTitleFromText(message: string): string {
	let t = message.trim();
	t = t.replace(
		/^(please\s+)?(can\s+you\s+|could\s+you\s+|help\s+me\s+)?(to\s+)?/i,
		"",
	);
	t = t.replace(
		/^(create|add|make|start|open)\s+(a\s+|an\s+|my\s+|new\s+)*(task|to-?do)(\s+(for|called|named|titled|:))?\s*/i,
		"",
	);
	t = t.replace(
		/^(a\s+|an\s+|new\s+)?(task|to-?do)(\s+(for|called|named|titled|:))?\s*/i,
		"",
	);
	// Drop trailing due/priority clauses from the title guess
	t = t.replace(
		/\b(due\s+(today|tomorrow|next\s+week|on\s+\w+)|by\s+\w+|priority\s*(:|=)?\s*(low|medium|high|urgent)|high\s+priority|low\s+priority|medium\s+priority).*$/i,
		"",
	);
	t = t.replace(/^["“']+|["”']+$/g, "").trim();
	// Vague starters with no substance
	if (
		!t ||
		/^(a\s+)?(new\s+)?(task|to-?do)?\.?$/i.test(t) ||
		/^(please|thanks|thank you)\.?$/i.test(t)
	) {
		return "";
	}
	// Cap length for the draft field
	return t.slice(0, 120);
}

export function parseCreateTaskDraft(
	message: string,
	now = new Date(),
): CreateTaskDraftArgs {
	const priority = parsePriorityFromText(message) ?? "medium";
	const dueDate = parseDueDateFromText(message, now);
	const title = parseTaskTitleFromText(message);
	return {
		title,
		priority,
		...(dueDate ? { dueDate } : {}),
	};
}

export function dueDateIsoOffset(
	daysFromToday: number,
	now = new Date(),
): string {
	return ymd(addDays(now, daysFromToday));
}
