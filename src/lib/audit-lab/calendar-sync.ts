import {
	createCalendarEvent,
	updateCalendarEvent,
} from "@/lib/actions/calendar.actions";
import type { ReviewSession } from "@/lib/audit-lab/types";
import { parseParticipants } from "@/lib/audit-lab/types";

type SyncActor = { userId: string; name: string };

function addMinutesIso(iso: string, minutes: number): string | undefined {
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return undefined;
	return new Date(ms + minutes * 60_000).toISOString();
}

/**
 * Creates or updates the Calendar event linked to a review session.
 * Best-effort: a Calendar/Appwrite failure never blocks the session action.
 * Returns the event id to persist on the session when one was just created.
 */
export async function syncSessionCalendarEvent(
	actor: SyncActor,
	session: ReviewSession,
): Promise<{ calendarEventId?: string }> {
	if (!session.scheduledAt) return {};
	const participantIds = parseParticipants(session.participantsJson)
		.map((p) => p.userId)
		.filter(Boolean);

	try {
		if (session.calendarEventId) {
			await updateCalendarEvent(session.calendarEventId, {
				title: session.title,
				startDate: session.scheduledAt,
				endDate: addMinutesIso(session.scheduledAt, session.durationMinutes),
			});
			return {};
		}
		const event = await createCalendarEvent({
			title: session.title,
			startDate: session.scheduledAt,
			endDate: addMinutesIso(session.scheduledAt, session.durationMinutes),
			type: "audit",
			description: `Audit Lab mock-audit session · ${session.department}`,
			participants: JSON.stringify(participantIds),
			createdBy: actor.name,
			createdByUserId: actor.userId,
		});
		return { calendarEventId: event.$id };
	} catch {
		return {};
	}
}

/** Keeps a cancelled session's Calendar event visible, marked cancelled. */
export async function markSessionCalendarEventCancelled(
	session: ReviewSession,
): Promise<void> {
	if (!session.calendarEventId) return;
	try {
		await updateCalendarEvent(session.calendarEventId, {
			title: `Cancelled: ${session.title}`,
		});
	} catch {
		/* best effort */
	}
}
