import type { EgressInfo } from "livekit-server-sdk";
import { Permission, Role } from "node-appwrite";
import { listFindings } from "@/lib/audit-upload/store";
import { listEvidenceMap } from "@/lib/audits/readiness/evidence-map.service";
import {
	createParticipantToken,
	createVoiceInterviewRoom,
	livekitBrowserUrl,
	roomServiceClient,
} from "@/lib/livekit/client";
import {
	attemptIdFromRoomName,
	egressFileDownloadUrl,
	startPracticeRoomEgress,
} from "@/lib/livekit/egress";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { isSessionFacilitator } from "./access";
import {
	markSessionCalendarEventCancelled,
	syncPrepDeadlineCalendarEvent,
	syncSessionCalendarEvent,
} from "./calendar-sync";
import { canAcceptEvidence, mergeEvidenceSeeds } from "./evidence-merge";
import { summarizeEvidenceLinks } from "./evidence-link-summary";
import { formatGapDescription } from "./findings";
import {
	enqueuePrepDeadlineReminders,
	enqueueSessionReminders,
	notifySessionCancelled,
	notifySessionCompleted,
	notifySessionRescheduled,
} from "./notifications";
import { buildSessionReport } from "./reports";
import {
	appendEvidenceStatusLog,
	createAttachmentRow,
	createAttemptRow,
	createEvidenceItemRow,
	createEvidenceLinkRow,
	createEvidenceRow,
	createGapRow,
	createParticipantRow,
	createQuestionRow,
	createReportRow,
	createScriptRow,
	createSessionRow,
	createTranscriptTurnRow,
	findParticipantRow,
	getAttempt,
	getAttemptUnscoped,
	getEvidence,
	getEvidenceLink,
	getSession,
	listEvidence,
	listEvidenceLinks,
	listGaps,
	listParticipantRows,
	listQuestions,
	listScripts,
	listSessions,
	listTranscriptTurnRows,
	resolveAccountIds,
	updateAttachmentRow,
	updateAttemptRow,
	updateEvidenceLinkRow,
	updateEvidenceRow,
	updateParticipantRow,
	updateSessionRow,
} from "./repository";
import {
	type AuditorPersona,
	followUpForVagueAnswer,
	INTERVIEWER_PROFILES,
} from "./roleplay";
import { applyPracticeScore } from "./score";
import {
	DEFAULT_SECTION_BUDGET_MINUTES,
	emptyCanvas,
	type ScriptSection,
	serializeScriptDocument,
	serializeScriptItems,
	suggestScriptSectionForQuestion,
} from "./script-sections";
import {
	isSimulationPhase,
	SIMULATION_PHASE_LABELS,
	writeSimulationPhaseToTrail,
} from "./simulation-phase";
import {
	EVIDENCE_STATUSES,
	type EvidenceStatus,
	parseParticipants,
	type ReviewAttempt,
	type ReviewSession,
	type ReviewSessionParticipantRow,
	type ReviewTranscriptTurnRow,
	SESSION_ROLES,
	type SessionParticipant,
	type SessionRole,
	type SessionStatus,
} from "./types";
import { scorecardToPracticeReadinessPct } from "./voice/coverage";
import {
	gradeVoiceTranscript,
	summarizeVoiceTranscript,
	type VoiceGradedItem,
} from "./voice/grade";
import { redactTranscriptTurns } from "./voice/pii";
import {
	deletePracticeRecordingFile,
	storePracticeRecordingFromUrl,
} from "./voice/recordings";
import { buildVoiceRubric, type VoiceAgentJobMetadata } from "./voice/rubric";

function requireDataResidencyRegion(): string | { error: string } {
	const region = process.env.AUDIT_LAB_DATA_RESIDENCY_REGION?.trim();
	if (region) return region;
	if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
		return {
			error:
				"Practice interviews need a data residency region configured. Ask an admin to set AUDIT_LAB_DATA_RESIDENCY_REGION.",
		};
	}
	return "local";
}

type Actor = {
	userId: string;
	name: string;
	email: string;
	orgId: string;
};

function audit(
	actor: Actor,
	action: "create" | "update" | "delete",
	summary: string,
	target: {
		type: string;
		id: string;
		label: string;
	},
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
		prepDeadlineAt?: string;
		durationMinutes?: number;
		framework?: string;
		participants?: Array<{
			userId: string;
			name?: string;
			email?: string;
			role?: string;
		}>;
	},
) {
	const department = input.department.trim();
	if (!department) {
		return { error: "Give a department for the review session." };
	}
	if (input.prepDeadlineAt && input.scheduledAt) {
		const prepMs = Date.parse(input.prepDeadlineAt);
		const startMs = Date.parse(input.scheduledAt);
		if (!Number.isNaN(prepMs) && !Number.isNaN(startMs) && prepMs > startMs) {
			return {
				error: "Prep deadline must be on or before the scheduled start.",
			};
		}
	}
	const participantsJson = JSON.stringify(
		(input.participants ?? [])
			.filter((p) => p.userId?.trim())
			.map((p) => ({
				userId: p.userId.trim(),
				name: p.name?.trim() || undefined,
				email: p.email?.trim() || undefined,
				role:
					p.role === "facilitator" ||
					p.role === "mock_auditor" ||
					p.role === "observer" ||
					p.role === "interviewee"
						? p.role
						: "interviewee",
			})),
	);
	let session = await createSessionRow({
		orgId: actor.orgId,
		title: (input.title || `${department} mock audit`).trim(),
		department,
		framework: input.framework?.trim() || "SOC 2",
		scheduledAt: input.scheduledAt,
		prepDeadlineAt: input.prepDeadlineAt,
		durationMinutes: input.durationMinutes ?? 60,
		status: input.scheduledAt ? "scheduled" : "draft",
		participantsJson,
		createdByUserId: actor.userId,
	});
	await audit(actor, "create", `Scheduled review session ${session.title}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	const { calendarEventId } = await syncSessionCalendarEvent(actor, session);
	if (calendarEventId) {
		session = await updateSessionRow(session.$id, { calendarEventId });
	}
	const { session: withPrepCal } = await syncPrepDeadlineCalendarEvent(
		actor,
		session,
	);
	session = withPrepCal;
	await enqueueSessionReminders(session).catch(() => undefined);
	await enqueuePrepDeadlineReminders(session).catch(() => undefined);
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
	let session = await updateSessionRow(sessionId, {
		scheduledAt,
		status: "scheduled",
	});
	await audit(
		actor,
		"update",
		`Rescheduled ${session.title} from ${existing.scheduledAt || "an unscheduled time"} to ${scheduledAt}`,
		{
			type: "review_session",
			id: session.$id,
			label: session.title,
		},
	);
	const { calendarEventId } = await syncSessionCalendarEvent(actor, session);
	if (calendarEventId) {
		session = await updateSessionRow(session.$id, { calendarEventId });
	}
	await notifySessionRescheduled(session).catch(() => undefined);
	return { session };
}

export async function cancelReviewSession(actor: Actor, sessionId: string) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const session = await updateSessionRow(sessionId, {
		status: "cancelled" satisfies SessionStatus,
	});
	await notifySessionCancelled(session).catch(() => undefined);
	await markSessionCalendarEventCancelled(session);
	await audit(actor, "update", `Cancelled ${session.title}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	return { session };
}

export async function completeReviewSession(actor: Actor, sessionId: string) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	if (existing.status === "cancelled") {
		return { error: "A cancelled session can't be marked complete." };
	}
	if (existing.status === "completed" || existing.status === "report_ready") {
		return { error: "That session is already complete." };
	}
	const { session } = await transitionSessionStatus(
		actor,
		sessionId,
		"completed",
	);
	if (session) await notifySessionCompleted(session).catch(() => undefined);
	return { session };
}

/** Persist the active interview phase shared by Detail sheet + Interview Builder. */
export async function setSimulationPhase(
	actor: Actor,
	sessionId: string,
	phase: string,
) {
	if (!isSimulationPhase(phase)) {
		return { error: "Pick a valid simulation phase." };
	}
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that simulation." };
	if (existing.status === "cancelled") {
		return { error: "That simulation is cancelled." };
	}
	const nextPhase = phase as ScriptSection;
	const session = await updateSessionRow(sessionId, {
		auditTrailJson: writeSimulationPhaseToTrail(
			existing.auditTrailJson,
			nextPhase,
		),
	});
	await audit(
		actor,
		"update",
		`Set ${session.title} phase to ${SIMULATION_PHASE_LABELS[nextPhase]}`,
		{
			type: "review_session",
			id: session.$id,
			label: session.title,
		},
	);
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

export async function assignSessionRole(
	actor: Actor,
	sessionId: string,
	userId: string,
	role: SessionRole,
) {
	if (!SESSION_ROLES.includes(role)) {
		return { error: `Role must be one of: ${SESSION_ROLES.join(", ")}.` };
	}
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const participants = parseParticipants(existing.participantsJson);
	const idx = participants.findIndex((p) => p.userId === userId);
	if (idx < 0) {
		participants.push({ userId, role });
	} else {
		participants[idx] = { ...participants[idx], role };
	}
	const session = await updateSessionRow(sessionId, {
		participantsJson: JSON.stringify(participants),
	});
	await audit(actor, "update", `Assigned ${role} on ${session.title}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	return { session, participants };
}

// Interview is voice/audio-only — the AI auditor grades spoken answers and any
// attached documentation, never a live screen-share walkthrough. Prompts are
// worded so the interviewee can fully answer by describing the process. The
// `review_questions` collection has no `requiresEvidence` column (adding one
// needs an explicit schema-change approval — see ReviewQuestion.requiresEvidence
// in types.ts), so it isn't written here: `rubric`'s wording is what
// `requiresEvidenceFromRubric` (voice/rubric.ts) reads back to derive the flag —
// only the two rows below that actually ask for a record/documentation turn on
// the attach control.
const TEMPLATE_QUESTIONS = [
	{
		prompt:
			"Walk me through the last time you reviewed access for this system. Who approved it, and where is the record?",
		rubric:
			"Answer from the last real occurrence; attach the approval record if you have it.",
	},
	{
		prompt:
			"In your own words, describe how a new hire receives access to this system, and what happens if their manager is out.",
		rubric:
			"Graded on the verbal explanation of the process, not a live demonstration.",
	},
	{
		prompt:
			"When a control failed last year, what changed in your process? Describe the new step in detail.",
		rubric:
			"Answer from the last real occurrence; attach documentation of the new step if you have it.",
	},
];

/** One question per Evidence Readiness Matrix requirement, so every requirement gets at least one interview question. `controlRef` carries the real requirementId (see `ReviewQuestion.controlRef`'s doc comment) rather than a generic template prompt. */
async function questionsFromEvidenceMap(): Promise<
	Array<{ prompt: string; rubric: string; controlRef: string }>
> {
	const rows = await listEvidenceMap();
	return rows.map((row) => ({
		prompt: `Walk me through how you meet this requirement: ${row.label}. What evidence do you have, and where is it on file?`,
		rubric:
			"Answer from the actual current process; attach the supporting document or record if you have it.",
		controlRef: row.requirementId,
	}));
}

export async function generateQuestionBank(
	actor: Actor,
	sessionId: string,
	source: "template" | "matrix" = "template",
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const existingPrompts = new Set(
		(await listQuestions(actor.orgId, sessionId)).map((q) => q.prompt.trim()),
	);
	const questionSource: Array<{
		prompt: string;
		rubric: string;
		source: string;
		controlRef?: string;
	}> =
		source === "matrix"
			? (await questionsFromEvidenceMap()).map((q) => ({
					...q,
					source: "matrix",
				}))
			: TEMPLATE_QUESTIONS.map((q) => ({ ...q, source: "template" }));
	const created = [];
	for (const q of questionSource) {
		if (existingPrompts.has(q.prompt.trim())) continue;
		created.push(
			await createQuestionRow({
				orgId: actor.orgId,
				sessionId,
				prompt: q.prompt,
				source: q.source,
				difficulty: "medium",
				rubric: q.rubric,
				controlRef: q.controlRef,
				createdByUserId: actor.userId,
			}),
		);
	}
	await audit(
		actor,
		"create",
		`Generated ${source} question bank for ${existing.title}`,
		{
			type: "review_session",
			id: existing.$id,
			label: existing.title,
		},
	);
	return { questions: created };
}

const MANUAL_QUESTION_SOURCES = [
	"finding",
	"readiness_gap",
	"template",
	"manual",
];

export async function addQuestion(
	actor: Actor,
	sessionId: string,
	prompt: string,
	difficulty = "medium",
	source = "manual",
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const trimmed = prompt.trim();
	if (!trimmed) return { error: "Give a question prompt." };
	const resolvedSource = MANUAL_QUESTION_SOURCES.includes(source)
		? source
		: "manual";
	const question = await createQuestionRow({
		orgId: actor.orgId,
		sessionId,
		prompt: trimmed,
		source: resolvedSource,
		difficulty,
		createdByUserId: actor.userId,
	});
	await audit(actor, "create", `Added a question to ${existing.title}`, {
		type: "review_question",
		id: question.$id,
		label: trimmed.slice(0, 80),
	});
	return { question };
}

export async function importQuestionsFromFindings(
	actor: Actor,
	sessionId: string,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const findings = await listFindings({ orgId: actor.orgId, limit: 8 });
	if (findings.length === 0) {
		return { error: "No uploaded audit findings to import yet." };
	}
	const alreadyImported = new Set(
		(await listQuestions(actor.orgId, sessionId))
			.filter((q) => q.source === "finding" && q.sourceFindingId)
			.map((q) => q.sourceFindingId),
	);
	const created = [];
	for (const finding of findings) {
		if (alreadyImported.has(finding.$id)) continue;
		const title = finding.title || finding.description || "prior finding";
		created.push(
			await createQuestionRow({
				orgId: actor.orgId,
				sessionId,
				prompt: `Last year the auditor found: ${title}. Walk me through how that works now, and show me the record.`,
				source: "finding",
				sourceFindingId: finding.$id,
				difficulty: "high",
				rubric: "Honest unknown is acceptable; must name the next step.",
				createdByUserId: actor.userId,
			}),
		);
	}
	await audit(
		actor,
		"create",
		`Imported ${created.length} questions from findings`,
		{
			type: "review_session",
			id: existing.$id,
			label: existing.title,
		},
	);
	return { questions: created };
}

export async function generateInterviewScript(actor: Actor, sessionId: string) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const questions = await listQuestions(actor.orgId, sessionId);
	if (questions.length === 0) {
		return { error: "Add or generate questions before building a script." };
	}
	const prior = await listScripts(actor.orgId, sessionId);
	const version = (prior[0]?.version ?? 0) + 1;
	const canvas = emptyCanvas();
	for (const [index, q] of questions.entries()) {
		const section = suggestScriptSectionForQuestion(
			q.prompt,
			index,
			questions.length,
		);
		canvas[section].push({
			id: `${section}-${q.$id}`,
			questionId: q.$id,
			prompt: q.prompt,
			minutes: 5,
			section,
		});
	}
	const script = await createScriptRow({
		orgId: actor.orgId,
		sessionId,
		version,
		itemsJson: serializeScriptDocument({
			sections: canvas,
			budgets: { ...DEFAULT_SECTION_BUDGET_MINUTES },
		}),
		createdByUserId: actor.userId,
	});
	await audit(
		actor,
		"create",
		`Interview script v${version} for ${existing.title}`,
		{
			type: "review_script",
			id: script.$id,
			label: `${existing.title} v${version}`,
		},
	);
	return { script, items: canvas };
}

export async function generateQuestionsFromGaps(
	actor: Actor,
	sessionId: string,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const gaps = (await listGaps(actor.orgId, sessionId)).filter(
		(gap) => gap.status === "open",
	);
	if (gaps.length === 0) {
		return { error: "No open readiness gaps to turn into questions yet." };
	}
	const existingPrompts = new Set(
		(await listQuestions(actor.orgId, sessionId))
			.filter((q) => q.source === "readiness_gap")
			.map((q) => q.prompt.trim()),
	);
	const created = [];
	for (const gap of gaps) {
		const prompt = `A readiness gap flagged: ${gap.description}. Walk me through how that's handled now, and show me the record.`;
		if (existingPrompts.has(prompt.trim())) continue;
		created.push(
			await createQuestionRow({
				orgId: actor.orgId,
				sessionId,
				prompt,
				source: "readiness_gap",
				difficulty: "high",
				rubric: "Honest unknown is acceptable; must name the next step.",
				createdByUserId: actor.userId,
			}),
		);
	}
	await audit(
		actor,
		"create",
		`Generated ${created.length} questions from readiness gaps`,
		{
			type: "review_session",
			id: existing.$id,
			label: existing.title,
		},
	);
	return { questions: created };
}

/** Turns the prompts currently placed in a script into reusable template questions for this session. */
export async function saveScriptAsTemplate(
	actor: Actor,
	sessionId: string,
	prompts: string[],
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const unique = [...new Set(prompts.map((p) => p.trim()).filter(Boolean))];
	if (unique.length === 0) {
		return {
			error: "The script is empty — add questions before saving a template.",
		};
	}
	const existingQuestions = await listQuestions(actor.orgId, sessionId);
	const existingTemplatePrompts = new Set(
		existingQuestions
			.filter((q) => q.source === "template")
			.map((q) => q.prompt.trim()),
	);
	const toCreate = unique.filter((p) => !existingTemplatePrompts.has(p));
	if (toCreate.length === 0) {
		return { questions: [] };
	}
	const created = [];
	for (const prompt of toCreate) {
		created.push(
			await createQuestionRow({
				orgId: actor.orgId,
				sessionId,
				prompt,
				source: "template",
				difficulty: "medium",
				createdByUserId: actor.userId,
			}),
		);
	}
	await audit(
		actor,
		"create",
		`Saved ${created.length} question${created.length === 1 ? "" : "s"} as template`,
		{
			type: "review_session",
			id: existing.$id,
			label: existing.title,
		},
	);
	return { questions: created };
}

export async function saveScriptDraft(
	actor: Actor,
	sessionId: string,
	itemsJson: string,
	expectedVersion?: number,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const prior = await listScripts(actor.orgId, sessionId);
	const latest = prior[0];
	if (expectedVersion != null && latest && latest.version !== expectedVersion) {
		return {
			error:
				"Someone else saved this script first. Refresh and merge your changes.",
			conflict: true,
			currentVersion: latest.version,
		};
	}
	const version = (latest?.version ?? 0) + 1;
	const script = await createScriptRow({
		orgId: actor.orgId,
		sessionId,
		version,
		itemsJson,
		createdByUserId: actor.userId,
	});
	await audit(
		actor,
		"update",
		`Saved script v${version} for ${existing.title}`,
		{
			type: "review_script",
			id: script.$id,
			label: `${existing.title} v${version}`,
		},
	);
	return { script };
}

export async function restoreScriptVersion(
	actor: Actor,
	sessionId: string,
	version: number,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const prior = await listScripts(actor.orgId, sessionId);
	const target = prior.find((row) => row.version === version);
	if (!target) return { error: "I couldn't find that script version." };
	const newVersion = (prior[0]?.version ?? 0) + 1;
	const script = await createScriptRow({
		orgId: actor.orgId,
		sessionId,
		version: newVersion,
		itemsJson: target.itemsJson,
		createdByUserId: actor.userId,
	});
	await audit(
		actor,
		"update",
		`Restored script v${version} as v${newVersion} for ${existing.title}`,
		{
			type: "review_script",
			id: script.$id,
			label: `${existing.title} v${newVersion}`,
		},
	);
	return { script };
}

export async function dismissAiBanner(
	actor: Actor,
	sessionId: string,
	signature: string,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const session = await updateSessionRow(sessionId, {
		aiBannerDismissedSignature: signature,
	});
	return { session };
}

export async function generateEvidenceRequestList(
	actor: Actor,
	sessionId: string,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const already = await listEvidence(actor.orgId, sessionId);
	const matrixRows = await listEvidenceMap();
	const seeds = matrixRows.map((row) => ({
		title: row.label,
		controlRef: row.requirementId,
		department: existing.department,
	}));
	const toCreate = mergeEvidenceSeeds(already, seeds);
	const created = [];
	for (const seed of toCreate) {
		created.push(
			await createEvidenceRow({
				...seed,
				orgId: actor.orgId,
				sessionId,
			}),
		);
	}
	await audit(
		actor,
		"create",
		`Generated evidence list for ${existing.title}`,
		{
			type: "review_session",
			id: existing.$id,
			label: existing.title,
		},
	);
	return { created, existing: already };
}

export async function assignEvidenceOwner(
	actor: Actor,
	requestId: string,
	ownerUserId: string,
	assigneeUserId?: string,
	managerUserId?: string,
) {
	const item = await getEvidence(actor.orgId, requestId);
	if (!item) return { error: "I couldn't find that evidence request." };
	const updated = await updateEvidenceRow(requestId, {
		ownerUserId,
		assigneeUserId,
		managerUserId,
	});
	await audit(actor, "update", `Assigned owner on ${item.title}`, {
		type: "evidence_request",
		id: item.$id,
		label: item.title,
	});
	return { evidence: updated };
}

export async function updateEvidenceStatus(
	actor: Actor,
	requestId: string,
	status: EvidenceStatus,
	note?: string,
) {
	if (!EVIDENCE_STATUSES.includes(status)) {
		return { error: `Status must be one of: ${EVIDENCE_STATUSES.join(", ")}.` };
	}
	const item = await getEvidence(actor.orgId, requestId);
	if (!item) return { error: "I couldn't find that evidence request." };
	if (item.sensitive && status === "submitted") {
		return {
			error:
				"Sensitive evidence needs internal review before it can be submitted.",
		};
	}
	if (status === "accepted") {
		const gate = canAcceptEvidence(item);
		if (!gate.ok) {
			return { error: gate.reason ?? "This item cannot be accepted yet." };
		}
	}
	const updated = await updateEvidenceRow(requestId, { status });
	await appendEvidenceStatusLog({
		orgId: actor.orgId,
		requestId,
		fromStatus: item.status,
		toStatus: status,
		actorUserId: actor.userId,
		note,
	});
	await audit(actor, "update", `Evidence ${item.title} is now ${status}`, {
		type: "evidence_request",
		id: item.$id,
		label: item.title,
	});
	return { evidence: updated };
}

/** A reviewer vouching for a link the system inferred (e.g. from `citedEvidence` text or a spoken claim). `aiSuggested` itself is left as-is — it's a provenance fact (how the link was created), not a status; `confirmedByUserId` is the separate "a human checked this" axis. */
export async function confirmEvidenceLink(actor: Actor, linkId: string) {
	const link = await getEvidenceLink(actor.orgId, linkId);
	if (!link) return { error: "I couldn't find that evidence link." };
	if (link.confirmedByUserId) return { link };
	const updated = await updateEvidenceLinkRow(linkId, {
		confirmedByUserId: actor.userId,
	});
	await audit(actor, "update", "Confirmed an AI-suggested evidence link", {
		type: "evidence_link",
		id: link.$id,
		label: link.requirementId,
	});
	return { link: updated };
}

export async function evidenceCoverageReport(
	orgId: string,
	sessionId?: string,
) {
	const items = await listEvidence(orgId, sessionId);
	const byStatus: Record<string, number> = {};
	for (const item of items) {
		byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
	}
	const missing = items.filter(
		(item) => item.status !== "accepted" && item.status !== "submitted",
	);
	// Matrix list columns join these by EvidenceRequest.controlRef (= requirementId).
	const linkSummaries = sessionId
		? summarizeEvidenceLinks(await listEvidenceLinks(orgId, sessionId))
		: undefined;
	return { total: items.length, byStatus, missing, linkSummaries };
}

export async function whoOwnsEvidence(orgId: string, requestId: string) {
	const item = await getEvidence(orgId, requestId);
	if (!item) return { error: "I couldn't find that evidence request." };
	return {
		title: item.title,
		ownerUserId: item.ownerUserId ?? null,
		assigneeUserId: item.assigneeUserId ?? null,
		managerUserId: item.managerUserId ?? null,
		department: item.department ?? null,
	};
}

export async function startPracticeRound(
	actor: Actor,
	sessionId: string,
	persona = "by_the_book",
	difficulty = "medium",
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const questions = await listQuestions(actor.orgId, sessionId);
	if (questions.length === 0) {
		return { error: "Generate a question bank before starting practice." };
	}
	const attempt = await createAttemptRow({
		orgId: actor.orgId,
		sessionId,
		intervieweeUserId: actor.userId,
		persona,
		difficulty,
		transcriptJson: JSON.stringify([]),
		scoresJson: JSON.stringify([]),
		status: "in_progress",
		createdByUserId: actor.userId,
	});
	await audit(actor, "create", `Started practice on ${existing.title}`, {
		type: "review_attempt",
		id: attempt.$id,
		label: existing.title,
	});
	return { attempt, firstQuestion: questions[0] };
}

export async function scoreAnswer(
	actor: Actor,
	attemptId: string,
	answer: string,
	score: number,
	options?: { retrievalMs?: number; showMe?: boolean },
) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const session = await getSession(actor.orgId, attempt.sessionId);
	const self = parseParticipants(session?.participantsJson).find(
		(p) => p.userId === actor.userId,
	);
	if (self?.role === "observer") {
		return { error: "Observers can annotate, but they cannot score." };
	}
	const scores = JSON.parse(attempt.scoresJson || "[]") as unknown[];
	const transcript = JSON.parse(attempt.transcriptJson || "[]") as unknown[];
	const {
		score: nextScore,
		honestUnknown,
		dimensions,
	} = applyPracticeScore(answer, score);
	const retrievalMs = options?.retrievalMs;
	const slowRetrieval =
		typeof retrievalMs === "number" && retrievalMs > 120_000;
	const followUp = followUpForVagueAnswer(answer);
	transcript.push({
		answer,
		at: new Date().toISOString(),
		retrievalMs,
		showMe: Boolean(options?.showMe),
		slowRetrieval,
		followUp,
	});
	scores.push({ score: nextScore, honestUnknown, dimensions, retrievalMs });
	if (/policy says|we actually do/i.test(answer)) {
		await createGapRow({
			orgId: actor.orgId,
			sessionId: attempt.sessionId,
			attemptId,
			description: `Policy-practice mismatch noted: ${answer.slice(0, 120)}`,
			status: "open",
		});
	} else if (nextScore < 3 && !honestUnknown) {
		await createGapRow({
			orgId: actor.orgId,
			sessionId: attempt.sessionId,
			attemptId,
			description: `Low score on answer: ${answer.slice(0, 120)}`,
			status: "open",
		});
	}
	const updated = await updateAttemptRow(attemptId, {
		transcriptJson: JSON.stringify(transcript),
		scoresJson: JSON.stringify(scores),
	});
	await audit(actor, "update", "Scored a practice answer", {
		type: "review_attempt",
		id: attempt.$id,
		label: attemptId,
	});
	return {
		attempt: updated,
		score: nextScore,
		honestUnknown,
		dimensions,
		followUp,
		slowRetrieval,
	};
}

/** Phase 1 of the voice interviewer: creates the attempt + LiveKit room, dispatches the agent worker. */
export async function startVoicePracticeRound(
	actor: Actor,
	sessionId: string,
	persona = "by_the_book",
): Promise<
	| { error: string }
	| { attempt: ReviewAttempt; backend: "nuance" }
	| {
			attempt: ReviewAttempt;
			roomName: string;
			token: string;
			livekitUrl: string;
	  }
> {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const questions = await listQuestions(actor.orgId, sessionId);
	if (questions.length === 0) {
		return {
			error: "Generate a question bank before starting a voice interview.",
		};
	}
	const residency = requireDataResidencyRegion();
	if (typeof residency === "object") return residency;

	const attempt = await createAttemptRow({
		orgId: actor.orgId,
		sessionId,
		intervieweeUserId: actor.userId,
		persona,
		difficulty: "voice",
		transcriptJson: JSON.stringify([]),
		scoresJson: JSON.stringify([]),
		status: "awaiting_consent",
		dataResidencyRegion: residency,
		createdByUserId: actor.userId,
	});
	await audit(
		actor,
		"create",
		`Started a voice interview on ${existing.title}`,
		{ type: "review_attempt", id: attempt.$id, label: existing.title },
	);

	// Simone/Valentina run on Nuance Live, which mints its own room/credentials
	// (see the nuance-token route) — no LiveKit room or worker job here.
	if (INTERVIEWER_PROFILES[persona as AuditorPersona]?.backend === "nuance") {
		return { attempt, backend: "nuance" as const };
	}

	const roomName = `review-attempt-${attempt.$id}`;
	const metadata: VoiceAgentJobMetadata = {
		attemptId: attempt.$id,
		orgId: actor.orgId,
		sessionTitle: existing.title,
		persona,
		rubric: buildVoiceRubric(questions),
	};
	await createVoiceInterviewRoom({
		roomName,
		metadata: JSON.stringify(metadata),
	});
	const token = await createParticipantToken({
		roomName,
		identity: actor.userId,
		name: actor.name,
	});
	const updated = await updateAttemptRow(attempt.$id, {
		callId: roomName,
		dataResidencyRegion: residency,
	});
	return {
		attempt: updated,
		roomName,
		token,
		livekitUrl: livekitBrowserUrl(),
	};
}

/** Marks consent captured, before the browser is allowed to connect to the room. */
export async function recordVoiceConsent(
	attemptId: string,
	options?: { audioAnonymized?: boolean },
) {
	const attempt = await getAttemptUnscoped(attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const roomName = attempt.callId || `review-attempt-${attemptId}`;
	let egressId: string | undefined;
	try {
		const egress = await startPracticeRoomEgress(roomName);
		egressId = egress.egressId;
	} catch (err) {
		console.error("[SERVER] recordVoiceConsent:startPracticeRoomEgress", err);
	}
	const updated = await updateAttemptRow(attemptId, {
		consentAt: new Date().toISOString(),
		egressId,
		audioAnonymized: options?.audioAnonymized ?? true,
		status: "live",
	});
	return { attempt: updated };
}

/** Persist a finished LiveKit egress file into Appwrite and point recordingUrl at the gated route. */
export async function ingestVoiceEgressRecording(info: EgressInfo) {
	const roomName = info.roomName || "";
	const attemptId = attemptIdFromRoomName(roomName);
	if (!attemptId) return { error: "Unknown practice room." };
	const attempt = await getAttemptUnscoped(attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const downloadUrl = egressFileDownloadUrl(info);
	if (!downloadUrl) return { error: "No egress file URL yet." };
	try {
		const stored = await storePracticeRecordingFromUrl({
			attemptId,
			orgId: attempt.orgId,
			downloadUrl,
		});
		const updated = await updateAttemptRow(attemptId, {
			recordingFileId: stored.fileId,
			recordingUrl: stored.recordingUrl,
			egressId: info.egressId || attempt.egressId,
		});
		await logAuditEvent({
			event_id: `audit_lab_practice_recording_${attempt.$id}`,
			event_title: "Practice recording stored",
			action: "create",
			source: "caalm",
			user_id: attempt.createdByUserId,
			user_name: "",
			user_email: "",
			orgId: attempt.orgId,
			status: "success",
			module: "audit_lab",
			target_type: "review_attempt",
			target_id: attempt.$id,
			target_label: attempt.sessionId,
			summary: "Practice interview recording saved to CAALM storage",
		}).catch(() => undefined);
		return { attempt: updated };
	} catch (err) {
		console.error("[SERVER] ingestVoiceEgressRecording", err);
		return { error: "Could not store the practice recording." };
	}
}

export async function deleteVoicePracticeRecording(
	actor: Actor,
	attemptId: string,
) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	if (attempt.recordingFileId) {
		await deletePracticeRecordingFile(attempt.recordingFileId).catch(
			() => undefined,
		);
	}
	const updated = await updateAttemptRow(attemptId, {
		recordingFileId: "",
		recordingUrl: "",
	});
	await audit(
		actor,
		"delete",
		`Deleted practice recording for ${attempt.sessionId}`,
		{ type: "review_attempt", id: attempt.$id, label: attempt.sessionId },
	);
	return { attempt: updated };
}

export async function auditPracticePiiReveal(actor: Actor, attemptId: string) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	await logAuditEvent({
		event_id: `audit_lab_practice_pii_reveal_${attempt.$id}_${Date.now()}`,
		event_title: "Practice transcript PII revealed",
		action: "view_pii",
		source: "caalm",
		user_id: actor.userId,
		user_name: actor.name,
		user_email: actor.email,
		orgId: actor.orgId,
		status: "success",
		module: "audit_lab",
		target_type: "review_attempt",
		target_id: attempt.$id,
		target_label: attempt.sessionId,
		summary: "Viewed original (unredacted) practice transcript",
	});
	return { attempt };
}

/**
 * Called by the voice-agent worker (shared-secret auth, no user session) after
 * every answered question, so a dropped call never loses transcript so far.
 * Persists one row per turn (`review_transcript_turns`) rather than appending
 * to the attempt's JSON blob, so Appwrite Realtime can push just the new row
 * instead of re-sending the whole growing transcript on every turn.
 */
/**
 * Builds per-roster-participant Appwrite permissions, translated from this
 * app's own `users` row id (what roster rows call `userId`) to the real
 * Appwrite auth account id — `Role.user(...)` only ever matches the latter,
 * so a grant built straight from the row id silently never matches anyone.
 */
async function buildRosterPermissions(
	roster: ReviewSessionParticipantRow[],
): Promise<string[]> {
	const accountIds = await resolveAccountIds(roster.map((p) => p.userId));
	return roster.flatMap((p) => {
		const accountId = accountIds.get(p.userId) ?? p.userId;
		return [
			Permission.read(Role.user(accountId)),
			Permission.update(Role.user(accountId)),
		];
	});
}

/** A matrix-generated question's `controlRef` doubles as its requirementId — see the doc comment on `ReviewQuestion.controlRef`. Undefined for template/legacy questions. */
async function requirementIdForQuestion(
	orgId: string,
	sessionId: string,
	questionId: string | undefined,
): Promise<string | undefined> {
	if (!questionId) return undefined;
	const questions = await listQuestions(orgId, sessionId);
	return questions.find((q) => q.$id === questionId)?.controlRef;
}

export async function recordVoiceTurn(
	attemptId: string,
	turn: {
		questionId: string;
		question: string;
		answer: string;
		citedEvidence?: string;
		answerQuality?: "strong" | "adequate" | "weak";
	},
) {
	const attempt = await getAttemptUnscoped(attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const roster = await listParticipantRows(attempt.orgId, attemptId);
	const permissions = await buildRosterPermissions(roster);
	const turnRow = await createTranscriptTurnRow(
		{
			orgId: attempt.orgId,
			sessionId: attempt.sessionId,
			attemptId,
			questionId: turn.questionId,
			question: turn.question,
			answer: turn.answer,
			citedEvidence: turn.citedEvidence,
			answerQuality: turn.answerQuality,
			at: new Date().toISOString(),
			redacted: false,
		},
		permissions.length > 0 ? permissions : undefined,
	);
	// A spoken answer is testimony, never proof by itself — tag it to its
	// requirement as a "claimed" link; it only turns documentary when an
	// attachment lands (see markAttachmentAttached). `citedEvidence` free text
	// (what the interviewee says they have) is marked AI-suggested/unconfirmed
	// rather than treated as the evidence itself.
	const requirementId = await requirementIdForQuestion(
		attempt.orgId,
		attempt.sessionId,
		turn.questionId,
	);
	if (requirementId) {
		await createEvidenceLinkRow({
			orgId: attempt.orgId,
			sessionId: attempt.sessionId,
			requirementId,
			attemptId,
			transcriptTurnId: turnRow.$id,
			evidenceType: "testimonial",
			relation: "supports",
			aiSuggested: Boolean(turn.citedEvidence),
		}).catch(() => undefined);
	}
	const updated = await updateAttemptRow(attemptId, { currentQuestionId: "" });
	return { attempt: updated };
}

/** Called by the worker right before it asks a rubric question, so refresh/other clients know what's "current." */
export async function setCurrentRubricQuestion(
	attemptId: string,
	questionId: string | null,
) {
	const updated = await updateAttemptRow(attemptId, {
		currentQuestionId: questionId ?? "",
	});
	return { attempt: updated };
}

/** Reads the durable transcript for an attempt, falling back to the legacy JSON blob for attempts recorded before `review_transcript_turns` existed. */
export async function listTranscriptTurns(
	orgId: string,
	attemptId: string,
): Promise<Array<{ questionId: string; question: string; answer: string }>> {
	const rows = await listTranscriptTurnRows(orgId, attemptId);
	if (rows.length > 0) {
		return rows.map((row) => ({
			questionId: row.questionId ?? "",
			question: row.question ?? "",
			answer: row.answer ?? "",
		}));
	}
	const attempt = await getAttemptUnscoped(attemptId);
	return JSON.parse(attempt?.transcriptJson || "[]");
}

/**
 * Creates the attachment's log entry at upload-start time (status `uploading`),
 * granted the same per-roster-participant row permissions as a spoken turn
 * (`recordVoiceTurn`). `questionId`/`replyToText` are passed explicitly by the
 * caller (whichever of the three entry points started the upload) rather than
 * read from `attempt.currentQuestionId` here, so the per-rubric-item attach
 * control can tag a row that isn't the currently-active question.
 */
export async function startAttachment(
	actor: Actor,
	attemptId: string,
	input: {
		fileName: string;
		mimeType: string;
		fileSize: number;
		source: "stage_drop" | "rubric_item" | "floating_widget";
		questionId?: string;
		replyToText?: string;
	},
): Promise<{ row: ReviewTranscriptTurnRow } | { error: string }> {
	const attempt = await getAttemptUnscoped(attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const roster = await listParticipantRows(attempt.orgId, attemptId);
	const permissions = await buildRosterPermissions(roster);
	const row = await createAttachmentRow(
		{
			orgId: attempt.orgId,
			sessionId: attempt.sessionId,
			attemptId,
			kind: "attachment",
			questionId: input.questionId,
			replyToText: input.replyToText,
			fileName: input.fileName,
			mimeType: input.mimeType,
			fileSize: input.fileSize,
			uploaderName: actor.name,
			source: input.source,
			attachmentStatus: "uploading",
			progressPct: 0,
			at: new Date().toISOString(),
		},
		permissions.length > 0 ? permissions : undefined,
	);
	await audit(
		actor,
		"create",
		`Attached ${input.fileName} during a practice interview`,
		{
			type: "review_attempt",
			id: attemptId,
			label: input.fileName,
		},
	);
	return { row };
}

export async function updateAttachmentProgress(
	rowId: string,
	progressPct: number,
): Promise<void> {
	await updateAttachmentRow(rowId, { progressPct });
}

export async function markAttachmentScanning(
	rowId: string,
	fileId: string,
): Promise<void> {
	await updateAttachmentRow(rowId, {
		attachmentStatus: "scanning",
		fileId,
		progressPct: 100,
	});
}

export async function markAttachmentAttached(
	rowId: string,
	sha256?: string,
): Promise<void> {
	const row = await updateAttachmentRow(rowId, { attachmentStatus: "attached" });
	const requirementId = await requirementIdForQuestion(
		row.orgId,
		row.sessionId,
		row.questionId,
	);
	if (!requirementId) return; // not tied to a matrix-generated rubric item

	const item = await createEvidenceItemRow({
		orgId: row.orgId,
		sessionId: row.sessionId,
		fileId: row.fileId,
		fileName: row.fileName,
		mimeType: row.mimeType,
		fileSize: row.fileSize,
		sha256,
		source: "interview_attachment",
	});
	await createEvidenceLinkRow({
		orgId: row.orgId,
		sessionId: row.sessionId,
		itemId: item.$id,
		requirementId,
		attemptId: row.attemptId,
		transcriptTurnId: row.$id,
		evidenceType: "documentary",
		relation: "supports",
		aiSuggested: false,
	});

	// A document landing answers the request this requirement maps to, if one
	// exists — reuses updateEvidenceStatus so the sensitive-item gate and
	// status log still apply, with a system actor (no human drove this).
	const matchingRequest = (await listEvidence(row.orgId, row.sessionId)).find(
		(e) => e.controlRef === requirementId && e.status === "not_started",
	);
	if (matchingRequest) {
		const statusResult = await updateEvidenceStatus(
			{ userId: "system", name: "System", email: "", orgId: row.orgId },
			matchingRequest.$id,
			"submitted",
		).catch((error) => {
			console.error(
				"[SERVER] markAttachmentAttached:updateEvidenceStatus",
				error,
			);
			return { error: "status_update_failed" as const };
		});
		if ("error" in statusResult) {
			console.error(
				"[SERVER] markAttachmentAttached: submitted failed",
				matchingRequest.$id,
				statusResult.error,
			);
		}
	}
}

export async function markAttachmentFailed(
	rowId: string,
	reason: string,
): Promise<void> {
	await updateAttachmentRow(rowId, {
		attachmentStatus: "failed",
		failureReason: reason,
	});
}

/** Retries the same row in place (back to `uploading`) — never creates a duplicate entry. */
export async function retryAttachment(
	actor: Actor,
	attemptId: string,
	rowId: string,
): Promise<void> {
	await updateAttachmentRow(rowId, {
		attachmentStatus: "uploading",
		progressPct: 0,
		failureReason: "",
	});
	await audit(actor, "update", "Retried a failed interview attachment", {
		type: "review_attempt",
		id: attemptId,
		label: rowId,
	});
}

/** Resolves this attempt's facilitator userId: whoever the session's invite list tags `facilitator`, falling back to the attempt's creator if no one has been explicitly assigned. */
function resolveFacilitatorUserId(
	session: ReviewSession | null,
	attempt: ReviewAttempt,
): string {
	const participants = parseParticipants(session?.participantsJson);
	const facilitator = participants.find((p) => p.role === "facilitator");
	return facilitator?.userId ?? attempt.createdByUserId;
}

/** Facilitator-only guard shared by `pauseVoiceInterview`/`resumeVoiceInterview`/`endSessionAsFacilitator`. */
function requireFacilitator(
	actor: Actor,
	session: ReviewSession | null,
	attempt: ReviewAttempt,
): { error: string } | null {
	const participants = parseParticipants(session?.participantsJson);
	if (
		!isSessionFacilitator(participants, actor.userId, attempt.createdByUserId)
	) {
		return { error: "Only the facilitator can do that." };
	}
	return null;
}

/** Looks up a joiner's invited role from the session's invite list; anyone not explicitly tagged joins as an interviewee. */
function resolveInviteRole(
	session: ReviewSession | null,
	userId: string,
): SessionRole {
	const participants = parseParticipants(session?.participantsJson);
	return participants.find((p) => p.userId === userId)?.role ?? "interviewee";
}

/** Upserts a live roster row when a participant's browser connects to the room. */
export async function joinSessionAsParticipant(
	actor: Actor,
	attemptId: string,
) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const session = await getSession(actor.orgId, attempt.sessionId);
	const facilitatorUserId = resolveFacilitatorUserId(session, attempt);
	const now = new Date().toISOString();

	const existing = await findParticipantRow(attemptId, actor.userId);
	if (existing) {
		const updated = await updateParticipantRow(existing.$id, {
			connectionState: "joined",
			joinedAt: now,
			leftAt: "",
		});
		return { participant: updated };
	}

	const permissions = [
		Permission.read(Role.user(actor.userId)),
		Permission.update(Role.user(actor.userId)),
		Permission.read(Role.user(facilitatorUserId)),
		Permission.update(Role.user(facilitatorUserId)),
	];
	const created = await createParticipantRow(
		{
			orgId: actor.orgId,
			sessionId: attempt.sessionId,
			attemptId,
			userId: actor.userId,
			name: actor.name,
			email: actor.email,
			role: resolveInviteRole(session, actor.userId),
			connectionState: "joined",
			joinedAt: now,
		},
		permissions,
	);
	return { participant: created };
}

/** Marks a roster row left when a participant disconnects — doesn't end the session for anyone else. */
export async function leaveSessionAsParticipant(
	actor: Actor,
	attemptId: string,
) {
	const existing = await findParticipantRow(attemptId, actor.userId);
	if (!existing) return { error: "I couldn't find that roster entry." };
	const updated = await updateParticipantRow(existing.$id, {
		connectionState: "left",
		leftAt: new Date().toISOString(),
	});
	return { participant: updated };
}

/** Mirrors local mic/cam toggle state into the roster row so other clients' Participants popover reflects it. */
export async function setParticipantAvState(
	actor: Actor,
	attemptId: string,
	state: { micOn?: boolean; camOn?: boolean },
) {
	const existing = await findParticipantRow(attemptId, actor.userId);
	if (!existing) return { error: "I couldn't find that roster entry." };
	const updated = await updateParticipantRow(existing.$id, state);
	return { participant: updated };
}

export async function listSessionParticipants(actor: Actor, attemptId: string) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const participants = await listParticipantRows(actor.orgId, attemptId);
	return { participants };
}

/** Facilitator-only. Flips status to `paused`, stamps `pausedAt`, and tells the worker via room metadata so it stops advancing the interview. */
export async function pauseVoiceInterview(
	actor: Actor,
	attemptId: string,
): Promise<{ error: string } | { attempt: ReviewAttempt }> {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const session = await getSession(actor.orgId, attempt.sessionId);
	const denied = requireFacilitator(actor, session, attempt);
	if (denied) return denied;
	if (attempt.status !== "live") return { attempt };
	const updated = await updateAttemptRow(attemptId, {
		status: "paused",
		pausedAt: new Date().toISOString(),
	});
	const roomName = attempt.callId || `review-attempt-${attemptId}`;
	await roomServiceClient()
		.updateRoomMetadata(roomName, JSON.stringify({ paused: true }))
		.catch((err) =>
			console.error("[SERVER] pauseVoiceInterview:updateRoomMetadata", err),
		);
	return { attempt: updated };
}

/** Facilitator-only. Resumes a paused interview, clearing `pausedAt` and telling the worker it can keep going. */
export async function resumeVoiceInterview(actor: Actor, attemptId: string) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const session = await getSession(actor.orgId, attempt.sessionId);
	const denied = requireFacilitator(actor, session, attempt);
	if (denied) return denied;
	if (attempt.status !== "paused") return { attempt };
	const updated = await updateAttemptRow(attemptId, {
		status: "live",
		pausedAt: "",
	});
	const roomName = attempt.callId || `review-attempt-${attemptId}`;
	await roomServiceClient()
		.updateRoomMetadata(roomName, JSON.stringify({ paused: false }))
		.catch((err) =>
			console.error("[SERVER] resumeVoiceInterview:updateRoomMetadata", err),
		);
	return { attempt: updated };
}

/**
 * Facilitator-only. Ends a live/paused interview for everyone, disconnecting
 * all room participants; the existing `room_finished` webhook (`finalizeVoiceInterview`)
 * still does the actual grading once LiveKit reports the room closed.
 */
export async function endVoiceInterview(actor: Actor, attemptId: string) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const session = await getSession(actor.orgId, attempt.sessionId);
	const denied = requireFacilitator(actor, session, attempt);
	if (denied) return denied;
	const roomName = attempt.callId || `review-attempt-${attemptId}`;
	await roomServiceClient()
		.deleteRoom(roomName)
		.catch((err) =>
			console.error("[SERVER] endVoiceInterview:deleteRoom", err),
		);
	return { attempt };
}

/**
 * Called from the LiveKit `room_finished` webhook, not the worker — grading
 * survives a worker crash/restart since it's driven by the room's own lifecycle.
 */
export async function finalizeVoiceInterview(roomName: string) {
	const attemptId = roomName.replace(/^review-attempt-/, "");
	return finalizeVoiceInterviewAttempt(attemptId);
}

/**
 * Called from the browser when a Nuance Live call ends (`session-ended`) —
 * there is no LiveKit room/webhook for a Nuance-hosted conversation.
 */
export async function finalizeNuanceInterview(attemptId: string) {
	return finalizeVoiceInterviewAttempt(attemptId);
}

/** Shared grading/report body for both the LiveKit and Nuance voice backends. */
/**
 * Turns an uncorroborated requirement into a finding at the end of a voice
 * interview: a spoken answer alone — however convincing — never closes a
 * requirement that calls for documentation (`requiresEvidence`); only a
 * documentary evidence link does. Gaps go to `review_gaps` for the session's
 * own follow-up list, never into the live readiness score (see
 * `computeLiveReadinessScore`, deliberately scoped to real contract/license
 * data only — a rehearsal gap is not a live compliance finding).
 */
async function raiseGapsForUncorroboratedRequirements(params: {
	attempt: ReviewAttempt;
	rubric: VoiceAgentJobMetadata["rubric"];
	scorecard: { items: VoiceGradedItem[] };
}): Promise<void> {
	const { attempt, rubric, scorecard } = params;
	const byQuestionId = new Map(scorecard.items.map((item) => [item.questionId, item]));

	for (const rubricItem of rubric) {
		if (!rubricItem.requiresEvidence || !rubricItem.controlRef) continue;
		const graded = byQuestionId.get(rubricItem.questionId);

		const links = await listEvidenceLinks(
			attempt.orgId,
			attempt.sessionId,
			rubricItem.controlRef,
		);
		const hasDocument = links.some((link) => link.evidenceType === "documentary");
		if (hasDocument) continue;

		const condition = graded
			? graded.verdict === "not_covered"
				? "Not addressed in the interview, and no document was attached."
				: "Claimed in the interview, but never backed by a document."
			: "No answer recorded, and no document was attached.";

		await createGapRow({
			orgId: attempt.orgId,
			sessionId: attempt.sessionId,
			attemptId: attempt.$id,
			description: formatGapDescription({
				requirementId: rubricItem.controlRef,
				criteria: rubricItem.prompt,
				condition,
				cause: graded?.rationale,
			}),
			status: "open",
		});

		const matchingRequest = (
			await listEvidence(attempt.orgId, attempt.sessionId)
		).find(
			(e) =>
				e.controlRef === rubricItem.controlRef &&
				e.status !== "accepted" &&
				e.status !== "not_applicable",
		);
		if (matchingRequest) {
			const statusResult = await updateEvidenceStatus(
				{ userId: "system", name: "System", email: "", orgId: attempt.orgId },
				matchingRequest.$id,
				"follow_up_requested",
			).catch((error) => {
				console.error(
					"[SERVER] raiseGapsForUncorroboratedRequirements:updateEvidenceStatus",
					error,
				);
				return { error: "status_update_failed" as const };
			});
			if ("error" in statusResult) {
				console.error(
					"[SERVER] raiseGapsForUncorroboratedRequirements: follow_up_requested failed",
					matchingRequest.$id,
					statusResult.error,
				);
			}
		}
	}
}

export async function finalizeVoiceInterviewAttempt(attemptId: string) {
	const attempt = await getAttemptUnscoped(attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	if (attempt.status === "completed") return { attempt };

	const questions = await listQuestions(attempt.orgId, attempt.sessionId);
	const rubric = buildVoiceRubric(questions);
	const transcript = await listTranscriptTurns(attempt.orgId, attemptId);

	const [scorecard, summary] = await Promise.all([
		gradeVoiceTranscript({ rubric, transcript }).catch(() => null),
		summarizeVoiceTranscript({ rubric, transcript }).catch(() => null),
	]);
	let practiceReadinessPct: number | undefined;
	if (scorecard) {
		await createReportRow({
			orgId: attempt.orgId,
			sessionId: attempt.sessionId,
			kind: "practice_scorecard",
			bodyJson: JSON.stringify({ attemptId: attempt.$id, ...scorecard }),
			createdByUserId: attempt.createdByUserId,
		});
		practiceReadinessPct = scorecardToPracticeReadinessPct(scorecard.items);
		await updateSessionRow(attempt.sessionId, { practiceReadinessPct }).catch(
			() => undefined,
		);
		await raiseGapsForUncorroboratedRequirements({
			attempt,
			rubric,
			scorecard,
		}).catch((error) =>
			console.error("[SERVER] raiseGapsForUncorroboratedRequirements:", error),
		);
	}
	if (summary) {
		await createReportRow({
			orgId: attempt.orgId,
			sessionId: attempt.sessionId,
			kind: "practice_summary",
			bodyJson: JSON.stringify({ attemptId: attempt.$id, ...summary }),
			createdByUserId: attempt.createdByUserId,
		}).catch(() => undefined);
	}
	const redacted = redactTranscriptTurns(transcript);
	const updated = await updateAttemptRow(attemptId, {
		status: "completed",
		transcriptRedactedJson: JSON.stringify(redacted),
	});
	await logAuditEvent({
		event_id: `audit_lab_voice_interview_complete_${attempt.$id}`,
		event_title: `Voice interview completed for ${attempt.sessionId}`,
		action: "update",
		source: "caalm",
		user_id: attempt.createdByUserId,
		user_name: "",
		user_email: "",
		orgId: attempt.orgId,
		status: "success",
		module: "audit_lab",
		target_type: "review_attempt",
		target_id: attempt.$id,
		target_label: attempt.sessionId,
		summary:
			typeof practiceReadinessPct === "number"
				? `Voice interview completed; simulation readiness set to ${practiceReadinessPct}%`
				: `Voice interview completed for ${attempt.sessionId}`,
	}).catch(() => undefined);
	if (typeof practiceReadinessPct === "number") {
		await logAuditEvent({
			event_id: `audit_lab_practice_readiness_${attempt.$id}`,
			event_title: "Practice readiness updated",
			action: "update",
			source: "caalm",
			user_id: attempt.createdByUserId,
			user_name: "",
			user_email: "",
			orgId: attempt.orgId,
			status: "success",
			module: "audit_lab",
			target_type: "review_session",
			target_id: attempt.sessionId,
			target_label: attempt.sessionId,
			summary: `Practice readiness set to ${practiceReadinessPct}% from voice scorecard`,
		}).catch(() => undefined);
	}
	return { attempt: updated };
}

export async function transitionSessionStatus(
	actor: Actor,
	sessionId: string,
	status: SessionStatus,
) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const session = await updateSessionRow(sessionId, { status });
	if (status === "completed" || status === "report_ready") {
		await buildSessionReport(actor, sessionId).catch(() => undefined);
	}
	await audit(actor, "update", `${session.title} is now ${status}`, {
		type: "review_session",
		id: session.$id,
		label: session.title,
	});
	return { session };
}

export async function requestFeedback(actor: Actor, attemptId: string) {
	const attempt = await getAttempt(actor.orgId, attemptId);
	if (!attempt) return { error: "I couldn't find that practice attempt." };
	const scores = JSON.parse(attempt.scoresJson || "[]") as Array<{
		score: number;
		honestUnknown?: boolean;
	}>;
	const avg =
		scores.length === 0
			? 0
			: scores.reduce((sum, row) => sum + Number(row.score || 0), 0) /
				scores.length;
	const feedback =
		avg >= 3
			? "Keep naming the last real occurrence and showing the record. Honest unknowns are acceptable."
			: "Tighten answers: say what happened last time, then show where the evidence lives.";
	await audit(actor, "update", "Requested practice feedback", {
		type: "review_attempt",
		id: attempt.$id,
		label: attemptId,
	});
	return { feedback, averageScore: avg };
}

export async function findRehearsalGaps(orgId: string, sessionId?: string) {
	return listGaps(orgId, sessionId);
}

export async function sessionReadinessReport(actor: Actor, sessionId: string) {
	const session = await getSession(actor.orgId, sessionId);
	if (!session) return { error: "I couldn't find that review session." };
	const gaps = await listGaps(actor.orgId, sessionId);
	const evidence = await listEvidence(actor.orgId, sessionId);
	const body = {
		sessionId,
		title: session.title,
		department: session.department,
		gapCount: gaps.length,
		evidenceAccepted: evidence.filter((e) => e.status === "accepted").length,
		evidenceTotal: evidence.length,
	};
	return { body };
}

export async function departmentReadinessSummary(orgId: string) {
	const sessions = await listSessions(orgId, 50);
	const evidence = await listEvidence(orgId);
	const byDept: Record<
		string,
		{ sessions: number; evidence: number; accepted: number }
	> = {};
	for (const session of sessions) {
		const dept = session.department || "Unassigned";
		byDept[dept] ??= { sessions: 0, evidence: 0, accepted: 0 };
		byDept[dept].sessions += 1;
	}
	for (const item of evidence) {
		const dept = item.department || "Unassigned";
		byDept[dept] ??= { sessions: 0, evidence: 0, accepted: 0 };
		byDept[dept].evidence += 1;
		if (item.status === "accepted") byDept[dept].accepted += 1;
	}
	return { byDepartment: byDept, sample: false };
}
