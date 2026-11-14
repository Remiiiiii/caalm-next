import { logAuditEvent } from "@/lib/services/audit-logger";
import {
	createSessionRow,
	getSession,
	listSessions,
	updateSessionRow,
} from "./repository";
import {
	parseParticipants,
	type SessionParticipant,
	type SessionStatus,
} from "./types";

type Actor = {
	userId: string;
	name: string;
	email: string;
	orgId: string;
};

function audit(
	actor: Actor,
	action: "create" | "update",
	summary: string,
	target: { type: string; id: string; label: string },
) {
	return logAuditEvent({
		event_id: `audit_lab_${action}_${target.id}`,
		event_title: summary,
		action,
		source: "caalm",
		user_id: actor.userId,
		user_name: actor.name,
		user_email: actor.email,
		orgId: actor.orgId,
		status: "success",
		module: "audit_lab",
		target_type: target.type,
		target_id: target.id,
		target_label: target.label,
		summary,
	}).catch(() => undefined);
}

export async function scheduleReviewSession(
	actor: Actor,
	input: {
		title?: string;
		department: string;
		scheduledAt?: string;
		durationMinutes?: number;
		framework?: string;
	},
) {
	const department = input.department.trim();
	if (!department) {
		return { error: "Give a department for the review session." };
	}
	const session = await createSessionRow({
		orgId: actor.orgId,
		title: (input.title || `${department} mock audit`).trim(),
		department,
		framework: input.framework?.trim() || "SOC 2",
		scheduledAt: input.scheduledAt,
		durationMinutes: input.durationMinutes ?? 60,
		status: input.scheduledAt ? "scheduled" : "draft",
		participantsJson: "[]",
		createdByUserId: actor.userId,
	});
	await audit(actor, "create", `Scheduled review session ${session.title}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	return { session };
}

export async function listReviewSessions(orgId: string) {
	return listSessions(orgId);
}

export async function rescheduleReviewSession(
	actor: Actor,
	sessionId: string,
	scheduledAt: string,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	if (existing.status === "cancelled") {
		return { error: "That session is cancelled. Schedule a new one instead." };
	}
	const session = await updateSessionRow(sessionId, {
		scheduledAt,
		status: "scheduled",
	});
	await audit(actor, "update", `Rescheduled ${session.title}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	return { session };
}

export async function cancelReviewSession(actor: Actor, sessionId: string) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const session = await updateSessionRow(sessionId, {
		status: "cancelled" satisfies SessionStatus,
	});
	await audit(actor, "update", `Cancelled ${session.title}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	return { session };
}

export async function inviteParticipants(
	actor: Actor,
	sessionId: string,
	invitees: SessionParticipant[],
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const current = parseParticipants(existing.participantsJson);
	const merged = [...current];
	for (const invitee of invitees) {
		if (!invitee.userId) continue;
		const idx = merged.findIndex((p) => p.userId === invitee.userId);
		if (idx >= 0) merged[idx] = { ...merged[idx], ...invitee };
		else merged.push({ ...invitee, role: invitee.role || "interviewee" });
	}
	const session = await updateSessionRow(sessionId, {
		participantsJson: JSON.stringify(merged),
	});
	await audit(actor, "update", `Invited participants to ${session.title}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	return { session, participants: merged };
}
