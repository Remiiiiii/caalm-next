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

function formatDeadlineDay(iso: string): string {
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return iso;
	return new Date(ms).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Puts the prep deadline on the notification feed for the creator and any
 * participants. When the deadline is within 7 days, uses deadline-approaching.
 */
export async function enqueuePrepDeadlineReminders(session: ReviewSession) {
	if (!session.prepDeadlineAt) return { sent: 0 };
	const deadlineMs = Date.parse(session.prepDeadlineAt);
	if (Number.isNaN(deadlineMs)) return { sent: 0 };

	const daysUntil = Math.ceil((deadlineMs - Date.now()) / 86_400_000);
	if (daysUntil < 0) return { sent: 0 };

	const userIds = new Set<string>();
	if (session.createdByUserId) userIds.add(session.createdByUserId);
	for (const participant of parseParticipants(session.participantsJson)) {
		if (participant.userId) userIds.add(participant.userId);
	}
	if (userIds.size === 0) return { sent: 0 };

	const approaching = daysUntil <= 7;
	const when = formatDeadlineDay(session.prepDeadlineAt);
	let sent = 0;

	for (const userId of userIds) {
		try {
			await createNotification({
				userId,
				title: approaching
					? `Prep deadline approaching: ${session.title}`
					: `Prep deadline set: ${session.title}`,
				message: approaching
					? `Prep for "${session.title}" is due on ${when} (${daysUntil} day${daysUntil === 1 ? "" : "s"} left).`
					: `Prep for "${session.title}" is due on ${when}. A calendar deadline event was added.`,
				type: approaching ? "deadline-approaching" : "info",
				actionUrl: `/audit-lab/sessions/${session.$id}`,
				actionText: "Open simulation",
				triggerType: "scheduled",
			});
			sent += 1;
		} catch {
			/* best effort */
		}
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

export async function notifySessionCompleted(session: ReviewSession) {
	const participants = parseParticipants(session.participantsJson);
	let sent = 0;
	for (const participant of participants) {
		if (!participant.userId) continue;
		try {
			await createNotification({
				userId: participant.userId,
				title: "Audit Lab session complete",
				message: `${session.title} is complete. The session report is ready.`,
				type: "success",
				actionUrl: `/audit-lab/sessions/${session.$id}`,
				actionText: "View report",
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
