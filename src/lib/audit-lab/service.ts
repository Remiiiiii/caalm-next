import { listFindings } from "@/lib/audit-upload/store";
import { logAuditEvent } from "@/lib/services/audit-logger";
import {
	markSessionCalendarEventCancelled,
	syncPrepDeadlineCalendarEvent,
	syncSessionCalendarEvent,
} from "./calendar-sync";
import { canAcceptEvidence } from "./evidence-merge";
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
	createAttemptRow,
	createEvidenceRow,
	createGapRow,
	createQuestionRow,
	createScriptRow,
	createSessionRow,
	getAttempt,
	getEvidence,
	getSession,
	listEvidence,
	listGaps,
	listQuestions,
	listScripts,
	listSessions,
	updateAttemptRow,
	updateEvidenceRow,
	updateSessionRow,
} from "./repository";
import { followUpForVagueAnswer } from "./roleplay";
import { applyPracticeScore } from "./score";
import {
	emptyCanvas,
	type ScriptSection,
	serializeScriptItems,
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
	SESSION_ROLES,
	type SessionParticipant,
	type SessionRole,
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
		if (
			!Number.isNaN(prepMs) &&
			!Number.isNaN(startMs) &&
			prepMs > startMs
		) {
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
				role: p.role === "facilitator" ||
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

const TEMPLATE_QUESTIONS = [
	"Walk me through the last time you reviewed access for this system. Who approved it, and where is the record?",
	"Show me how a new hire receives access. What happens if the manager is out?",
	"When a control failed last year, what changed in your process? Show me evidence of the new step.",
];

export async function generateQuestionBank(actor: Actor, sessionId: string) {
	const existing = await getSession(actor.orgId, sessionId);
	if (!existing) return { error: "I couldn't find that review session." };
	const existingPrompts = new Set(
		(await listQuestions(actor.orgId, sessionId)).map((q) => q.prompt.trim()),
	);
	const created = [];
	for (const prompt of TEMPLATE_QUESTIONS) {
		if (existingPrompts.has(prompt.trim())) continue;
		created.push(
			await createQuestionRow({
				orgId: actor.orgId,
				sessionId,
				prompt,
				source: "template",
				difficulty: "medium",
				rubric: "Answer from the last real occurrence; show the record.",
				createdByUserId: actor.userId,
			}),
		);
	}
	await audit(
		actor,
		"create",
		`Generated question bank for ${existing.title}`,
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
		const section =
			index === 0
				? "opening"
				: index === questions.length - 1
					? "closing"
					: index % 2 === 0
						? "evidence"
						: "process";
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
		itemsJson: serializeScriptItems(canvas),
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
	const titles = new Set(already.map((item) => item.title));
	const seeds = [
		{
			title: "Access review evidence",
			controlRef: "CC6",
			department: existing.department,
		},
		{
			title: "Change management tickets for the period",
			controlRef: "CC8",
			department: existing.department,
		},
		{
			title: "Policy acknowledgement for in-scope staff",
			controlRef: "CC1",
			department: existing.department,
		},
	];
	const created = [];
	for (const seed of seeds) {
		if (titles.has(seed.title)) continue;
		created.push(
			await createEvidenceRow({
				orgId: actor.orgId,
				sessionId,
				title: seed.title,
				controlRef: seed.controlRef,
				department: seed.department,
				status: "not_started",
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
	return { total: items.length, byStatus, missing };
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
