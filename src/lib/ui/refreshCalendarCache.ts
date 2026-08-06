import { mutate } from "swr";
import { swrKeys } from "@/lib/swr-config";

export type CalendarOptimisticEvent = {
	$id: string;
	title: string;
	startDate: string;
	endDate?: string;
	startTime?: string;
	endTime?: string;
	type?: string;
	description?: string;
	participants?: string;
	sensitivityLevel?: string;
	requiresApproval?: boolean;
	approvalStatus?: string;
};

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
	const part = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
	const [y, m] = part.split("-").map(Number);
	if (!y || !m) return null;
	return { year: y, month: m };
}

function eventMatchesId(
	event: unknown,
	id: string,
): event is Record<string, unknown> {
	return (
		!!event &&
		typeof event === "object" &&
		((event as { $id?: string }).$id === id ||
			(event as { id?: string }).id === id)
	);
}

function mapEventsInCache(
	current: unknown,
	mapFn: (events: unknown[]) => unknown[],
): unknown {
	if (!current) {
		return { success: true, events: mapFn([]) };
	}
	if (Array.isArray(current)) {
		return mapFn(current);
	}
	if (typeof current === "object" && current !== null) {
		const wrapped = current as { events?: unknown[]; success?: boolean };
		const events = Array.isArray(wrapped.events) ? wrapped.events : [];
		return { ...wrapped, success: true, events: mapFn(events) };
	}
	return current;
}

async function fetchCalendarMonthNoCache(
	year: number,
	month: number,
): Promise<unknown> {
	const key = swrKeys.calendarEvents(year, month);
	const url = `${key}&noCache=1`;
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`Calendar refresh failed (${res.status})`);
	}
	return res.json();
}

function dispatchCalendarUpdated(
	ym: { year: number; month: number } | null,
	eventId?: string,
): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("caalm:calendar-updated", {
			detail: ym
				? { year: ym.year, month: ym.month, ...(eventId ? { eventId } : {}) }
				: {},
		}),
	);
}

/**
 * Instantly update calendar SWR caches after an assistant (or other) create.
 * Optimistically inserts the event, then revalidates so server data wins.
 */
export async function refreshCalendarAfterMeetingCreated(
	meeting: CalendarOptimisticEvent,
): Promise<void> {
	const ym = parseYearMonth(meeting.startDate);
	if (!ym) {
		await mutate(
			(key) =>
				typeof key === "string" && key.includes("/api/calendar/events"),
			undefined,
			{ revalidate: true },
		);
		return;
	}

	const key = swrKeys.calendarEvents(ym.year, ym.month);
	const optimistic = {
		$id: meeting.$id,
		title: meeting.title,
		startDate: meeting.startDate,
		endDate: meeting.endDate ?? meeting.startDate,
		startTime: meeting.startTime,
		endTime: meeting.endTime,
		type: meeting.type ?? "meeting",
		description: meeting.description ?? "",
		participants: meeting.participants ?? "",
		sensitivityLevel: meeting.sensitivityLevel ?? "standard",
		requiresApproval: meeting.requiresApproval ?? false,
		approvalStatus: meeting.approvalStatus ?? "not_required",
		overrides: "[]",
	};

	await mutate(
		key,
		(current: unknown) =>
			mapEventsInCache(current, (events) => {
				if (events.some((e) => eventMatchesId(e, optimistic.$id))) {
					return events;
				}
				return [...events, optimistic];
			}),
		{ revalidate: false },
	);

	try {
		const fresh = await fetchCalendarMonthNoCache(ym.year, ym.month);
		await mutate(key, fresh, { revalidate: false });
	} catch {
		// Keep optimistic insert if the bypass fetch fails
	}

	dispatchCalendarUpdated(ym, meeting.$id);
}

/**
 * Patch an existing event in SWR (reschedule), then fetch with noCache so Redis
 * stale entries cannot overwrite the update.
 */
export async function refreshCalendarAfterEventUpdated(
	meeting: CalendarOptimisticEvent,
): Promise<void> {
	const ym = parseYearMonth(meeting.startDate);
	if (!ym) {
		await revalidateCalendarMonth();
		return;
	}

	const key = swrKeys.calendarEvents(ym.year, ym.month);

	await mutate(
		key,
		(current: unknown) =>
			mapEventsInCache(current, (events) =>
				events.map((e) => {
					if (!eventMatchesId(e, meeting.$id)) return e;
					const row = e as Record<string, unknown>;
					return {
						...row,
						title: meeting.title ?? row.title,
						startDate: meeting.startDate,
						endDate: meeting.endDate ?? meeting.startDate,
						startTime: meeting.startTime ?? row.startTime,
						endTime: meeting.endTime ?? row.endTime,
					};
				}),
			),
		{ revalidate: false },
	);

	try {
		const fresh = await fetchCalendarMonthNoCache(ym.year, ym.month);
		await mutate(key, fresh, { revalidate: false });
	} catch {
		// Keep optimistic patch
	}

	dispatchCalendarUpdated(ym, meeting.$id);
}

/** Remove an event from SWR after cancel, then noCache refresh. */
export async function refreshCalendarAfterEventRemoved(
	eventId: string,
	dateStr?: string,
): Promise<void> {
	const ym = dateStr ? parseYearMonth(dateStr) : null;
	if (!ym) {
		await revalidateCalendarMonth(dateStr);
		return;
	}

	const key = swrKeys.calendarEvents(ym.year, ym.month);
	await mutate(
		key,
		(current: unknown) =>
			mapEventsInCache(current, (events) =>
				events.filter((e) => !eventMatchesId(e, eventId)),
			),
		{ revalidate: false },
	);

	try {
		const fresh = await fetchCalendarMonthNoCache(ym.year, ym.month);
		await mutate(key, fresh, { revalidate: false });
	} catch {
		// Keep optimistic removal
	}

	dispatchCalendarUpdated(ym, eventId);
}

/** Revalidate calendar month caches after reschedule/cancel (no optimistic insert). */
export async function revalidateCalendarMonth(dateStr?: string): Promise<void> {
	const ym = dateStr ? parseYearMonth(dateStr) : null;
	if (ym) {
		const key = swrKeys.calendarEvents(ym.year, ym.month);
		try {
			const fresh = await fetchCalendarMonthNoCache(ym.year, ym.month);
			await mutate(key, fresh, { revalidate: false });
		} catch {
			await mutate(key, undefined, { revalidate: true });
		}
	} else {
		await mutate(
			(key) =>
				typeof key === "string" && key.includes("/api/calendar/events"),
			undefined,
			{ revalidate: true },
		);
	}
	dispatchCalendarUpdated(ym);
}
