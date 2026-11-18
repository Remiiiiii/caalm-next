import {
	createCalendarEvent,
	updateCalendarEvent,
} from "@/lib/actions/calendar.actions";
import { updateSessionRow } from "@/lib/audit-lab/repository";
import type { ReviewSession } from "@/lib/audit-lab/types";
import { parseParticipants } from "@/lib/audit-lab/types";

type SyncActor = { userId: string; name: string };

type AuditTrailShape = {
	prepCalendarEventId?: string;
	[key: string]: unknown;
};

function parseAuditTrail(json: string | undefined): AuditTrailShape {
	if (!json?.trim()) return {};
	try {
		const parsed = JSON.parse(json) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		return parsed as AuditTrailShape;
	} catch {
		return {};
	}
}

function writePrepCalendarEventId(
	existingJson: string | undefined,
	prepCalendarEventId: string,
): string {
	const trail = parseAuditTrail(existingJson);
	return JSON.stringify({ ...trail, prepCalendarEventId });
}

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

/**
 * Creates or updates a Calendar "deadline" event for the prep deadline.
 * Event id is stored on `auditTrailJson.prepCalendarEventId` (no extra column yet).
 */
export async function syncPrepDeadlineCalendarEvent(
	actor: SyncActor,
	session: ReviewSession,
): Promise<{ session: ReviewSession }> {
	if (!session.prepDeadlineAt) return { session };

	const trail = parseAuditTrail(session.auditTrailJson);
	const participantIds = parseParticipants(session.participantsJson)
		.map((p) => p.userId)
		.filter(Boolean);
	const title = `Prep deadline: ${session.title}`;
	const description = `Evidence and prep due before the Audit Lab simulation · ${session.department}`;

	try {
		if (trail.prepCalendarEventId) {
			await updateCalendarEvent(trail.prepCalendarEventId, {
				title,
				startDate: session.prepDeadlineAt,
				endDate: addMinutesIso(session.prepDeadlineAt, 30),
			});
			return { session };
		}

		const event = await createCalendarEvent({
			title,
			startDate: session.prepDeadlineAt,
			endDate: addMinutesIso(session.prepDeadlineAt, 30),
			type: "deadline",
			description,
			participants: JSON.stringify(participantIds),
			createdBy: actor.name,
			createdByUserId: actor.userId,
		});

		if (!event.$id) return { session };

		const updated = await updateSessionRow(session.$id, {
			auditTrailJson: writePrepCalendarEventId(
				session.auditTrailJson,
				event.$id,
			),
		});
		return { session: updated };
	} catch {
		return { session };
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

	const trail = parseAuditTrail(session.auditTrailJson);
	if (!trail.prepCalendarEventId) return;
	try {
		await updateCalendarEvent(trail.prepCalendarEventId, {
			title: `Cancelled prep deadline: ${session.title}`,
		});
	} catch {
		/* best effort */
	}
}
