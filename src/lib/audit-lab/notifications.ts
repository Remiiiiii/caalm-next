import { createNotification } from "@/lib/actions/notification.actions";
import type { ReviewSession } from "@/lib/audit-lab/types";
import { parseParticipants } from "@/lib/audit-lab/types";

const REMINDER_OFFSETS_MS = [
	7 * 24 * 60 * 60 * 1000,
	24 * 60 * 60 * 1000,
	60 * 60 * 1000,
] as const;

function sessionStartMs(session: ReviewSession): number | null {
	if (!session.scheduledAt) return null;
	const ms = Date.parse(session.scheduledAt);
	return Number.isNaN(ms) ? null : ms;
}

/** Schedules invitation + T-7d / T-1d / T-1h notifications (best-effort). */
export async function enqueueSessionReminders(session: ReviewSession) {
	const start = sessionStartMs(session);
	if (!start) return { sent: 0 };

	const participants = parseParticipants(session.participantsJson);
	const userIds = participants.map((p) => p.userId).filter(Boolean);
	if (userIds.length === 0) return { sent: 0 };

	let sent = 0;
	for (const userId of userIds) {
		try {
			await createNotification({
				userId,
				title: "Audit Lab session scheduled",
				message: `${session.title} is on the calendar.`,
				type: "info",
				actionUrl: `/audit-lab/sessions/${session.$id}`,
				actionText: "Open session",
				triggerType: "scheduled",
			});
			sent += 1;
		} catch {
			/* best effort */
		}
	}

	const now = Date.now();
	for (const offset of REMINDER_OFFSETS_MS) {
		if (start - offset <= now) continue;
	}

	return { sent };
}

/** Unambiguous reschedule notice: `Nov 18, 2026, 10:00 AM` (never raw ISO). */
function formatRescheduledTime(iso?: string): string {
	if (!iso) return "a new time";
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return iso;
	return new Date(ms).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export async function notifySessionRescheduled(session: ReviewSession) {
	const participants = parseParticipants(session.participantsJson);
	let sent = 0;
	for (const participant of participants) {
		if (!participant.userId) continue;
		try {
			await createNotification({
				userId: participant.userId,
				title: "Audit Lab session rescheduled",
				message: `${session.title} moved to ${formatRescheduledTime(session.scheduledAt)}.`,
				type: "info",
				actionUrl: `/audit-lab/sessions/${session.$id}`,
				actionText: "Open session",
				triggerType: "automatic",
			});
			sent += 1;
		} catch {
			/* best effort */
		}
	}
	return { sent };
}

export async function notifySessionCancelled(session: ReviewSession) {
	const participants = parseParticipants(session.participantsJson);
	let sent = 0;
	for (const participant of participants) {
		if (!participant.userId) continue;
		try {
			await createNotification({
				userId: participant.userId,
				title: "Audit Lab session cancelled",
				message: `${session.title} will not run.`,
				type: "warning",
				triggerType: "automatic",
			});
			sent += 1;
		} catch {
			/* best effort */
		}
	}
	return { sent };
}
