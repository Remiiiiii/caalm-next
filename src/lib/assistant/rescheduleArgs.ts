/**
 * Correct relative dates for reschedule so the model can't invent the wrong day.
 */

const WEEKDAY_INDEX: Record<string, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
};

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

export function formatLocalYmd(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfLocalDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Soonest occurrence of weekday (0=Sun), including today. */
export function upcomingWeekday(from: Date, weekday: number): Date {
	const d = startOfLocalDay(from);
	const delta = (weekday - d.getDay() + 7) % 7;
	d.setDate(d.getDate() + delta);
	return d;
}

/** Weekday in the following week (always at least 7 days ahead of this week's occurrence). */
export function followingWeekWeekday(from: Date, weekday: number): Date {
	const thisWeek = upcomingWeekday(from, weekday);
	thisWeek.setDate(thisWeek.getDate() + 7);
	return thisWeek;
}

/**
 * Resolve a relative day from the user message (Friday, tomorrow, next Monday, …).
 * Returns YYYY-MM-DD or null when no relative day can be resolved.
 */
export function resolveRelativeRescheduleDate(
	userMessage: string,
	now: Date = new Date(),
): string | null {
	const q = userMessage.toLowerCase();

	if (/\btomorrow\b/.test(q)) {
		const d = startOfLocalDay(now);
		d.setDate(d.getDate() + 1);
		return formatLocalYmd(d);
	}

	const nextMatch = q.match(
		/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
	);
	if (nextMatch?.[1]) {
		return formatLocalYmd(
			followingWeekWeekday(now, WEEKDAY_INDEX[nextMatch[1]]!),
		);
	}

	const dayMatch = q.match(
		/\b(?:this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
	);
	if (dayMatch?.[1]) {
		return formatLocalYmd(upcomingWeekday(now, WEEKDAY_INDEX[dayMatch[1]]!));
	}

	return null;
}

function messageMentionsNewDay(q: string): boolean {
	return (
		/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(q) ||
		/\b(tomorrow|tonight|next\s+week|next\s+month|this\s+weekend)\b/.test(q) ||
		/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/.test(
			q,
		) ||
		/\b20\d{2}-\d{2}-\d{2}\b/.test(q) ||
		/\bthe\s+\d{1,2}(st|nd|rd|th)\b/.test(q) ||
		/\bon\s+the\s+\d{1,2}(st|nd|rd|th)?\b/.test(q)
	);
}

/**
 * Normalize reschedule tool args from the model:
 * - Time-only requests: drop invented newDate (keep meeting on its day).
 * - Weekday / tomorrow requests: overwrite newDate with the correctly resolved day.
 */
export function sanitizeRescheduleArgs(
	userMessage: string,
	args: Record<string, unknown>,
	now: Date = new Date(),
): Record<string, unknown> {
	const q = userMessage.toLowerCase();
	const resolved = resolveRelativeRescheduleDate(userMessage, now);
	if (resolved) {
		return { ...args, newDate: resolved };
	}

	if (messageMentionsNewDay(q)) return args;
	if (!("newDate" in args)) return args;

	const { newDate: _dropped, ...rest } = args;
	return rest;
}
