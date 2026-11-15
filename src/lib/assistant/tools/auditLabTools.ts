import { PERMISSIONS } from "@/constants/permissions";
import {
	addQuestion,
	assignEvidenceOwner,
	assignSessionRole,
	cancelReviewSession,
	departmentReadinessSummary,
	evidenceCoverageReport,
	findRehearsalGaps,
	generateEvidenceRequestList,
	generateInterviewScript,
	generateQuestionBank,
	importQuestionsFromFindings,
	inviteParticipants,
	listReviewSessions,
	requestFeedback,
	rescheduleReviewSession,
	scheduleReviewSession,
	scoreAnswer,
	sessionReadinessReport,
	startPracticeRound,
	updateEvidenceStatus,
	whoOwnsEvidence,
} from "@/lib/audit-lab/service";
import type { EvidenceStatus, SessionRole } from "@/lib/audit-lab/types";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";

function actor(ctx: ToolContext) {
	return {
		userId: ctx.user.$id,
		name:
			(ctx.user as { fullName?: string }).fullName ||
			ctx.user.name ||
			ctx.user.email ||
			"User",
		email: ctx.user.email || "",
		orgId: ctx.orgId,
	};
}

export const AUDIT_LAB_TOOLS: ToolDefinition[] = [
	{
		name: "schedule_review_session",
		description:
			"Create a mock-audit review session (department, date, duration).",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				department: { type: "string" },
				title: { type: "string" },
				scheduledAt: { type: "string", description: "ISO datetime" },
				durationMinutes: { type: "number" },
				framework: { type: "string" },
			},
			required: ["department"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS])) {
				return { result: { error: "Missing audit_lab.manage_sessions" } };
			}
			return {
				result: await scheduleReviewSession(actor(ctx), {
					department: String(args.department ?? ""),
					title: args.title ? String(args.title) : undefined,
					scheduledAt: args.scheduledAt
						? String(args.scheduledAt)
						: undefined,
					durationMinutes: args.durationMinutes
						? Number(args.durationMinutes)
						: undefined,
					framework: args.framework ? String(args.framework) : undefined,
				}),
			};
		},
	},
	{
		name: "list_review_sessions",
		description: "List Audit Lab review sessions for the caller's organization.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.VIEW],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT_LAB.VIEW])) {
				return { result: { error: "Missing audit_lab.view" } };
			}
			return { result: { sessions: await listReviewSessions(ctx.orgId) } };
		},
	},
	{
		name: "reschedule_review_session",
		description: "Move a review session to a new date and time.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				sessionId: { type: "string" },
				scheduledAt: { type: "string" },
			},
			required: ["sessionId", "scheduledAt"],
		},
		handler: async (ctx, args) => ({
			result: await rescheduleReviewSession(
				actor(ctx),
				String(args.sessionId ?? ""),
				String(args.scheduledAt ?? ""),
			),
		}),
	},
	{
		name: "cancel_review_session",
		description: "Cancel a review session.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
			required: ["sessionId"],
		},
		handler: async (ctx, args) => ({
			result: await cancelReviewSession(
				actor(ctx),
				String(args.sessionId ?? ""),
			),
		}),
	},
	{
		name: "invite_participants",
		description: "Invite people to a review session.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				sessionId: { type: "string" },
				userId: { type: "string" },
				name: { type: "string" },
				role: { type: "string" },
			},
			required: ["sessionId", "userId"],
		},
		handler: async (ctx, args) => ({
			result: await inviteParticipants(actor(ctx), String(args.sessionId ?? ""), [
				{
					userId: String(args.userId ?? ""),
					name: args.name ? String(args.name) : undefined,
					role: (args.role as SessionRole) || "interviewee",
				},
			]),
		}),
	},
	{
		name: "assign_session_role",
		description:
			"Assign facilitator, mock_auditor, interviewee, or observer on a session.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				sessionId: { type: "string" },
				userId: { type: "string" },
				role: { type: "string" },
			},
			required: ["sessionId", "userId", "role"],
		},
		handler: async (ctx, args) => ({
			result: await assignSessionRole(
				actor(ctx),
				String(args.sessionId ?? ""),
				String(args.userId ?? ""),
				args.role as SessionRole,
			),
		}),
	},
	{
		name: "generate_question_bank",
		description: "Generate a starter question bank for a session.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
			required: ["sessionId"],
		},
		handler: async (ctx, args) => ({
			result: await generateQuestionBank(
				actor(ctx),
				String(args.sessionId ?? ""),
			),
		}),
	},
	{
		name: "add_question",
		description: "Add a question to a session bank by hand.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				sessionId: { type: "string" },
				prompt: { type: "string" },
				difficulty: { type: "string" },
			},
			required: ["sessionId", "prompt"],
		},
		handler: async (ctx, args) => ({
			result: await addQuestion(
				actor(ctx),
				String(args.sessionId ?? ""),
				String(args.prompt ?? ""),
				args.difficulty ? String(args.difficulty) : undefined,
			),
		}),
	},
	{
		name: "import_questions_from_findings",
		description: "Seed questions from uploaded audit findings.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
			required: ["sessionId"],
		},
		handler: async (ctx, args) => ({
			result: await importQuestionsFromFindings(
				actor(ctx),
				String(args.sessionId ?? ""),
			),
		}),
	},
	{
		name: "generate_interview_script",
		description: "Assemble a timed interview script from the question bank.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS],
		mutating: true,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
			required: ["sessionId"],
		},
		handler: async (ctx, args) => ({
			result: await generateInterviewScript(
				actor(ctx),
				String(args.sessionId ?? ""),
			),
		}),
	},
	{
		name: "generate_evidence_request_list",
		description: "Generate the PBC-style evidence list (merge, do not wipe).",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_EVIDENCE],
		mutating: true,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
			required: ["sessionId"],
		},
		handler: async (ctx, args) => ({
			result: await generateEvidenceRequestList(
				actor(ctx),
				String(args.sessionId ?? ""),
			),
		}),
	},
	{
		name: "assign_evidence_owner",
		description: "Assign owner/assignee/manager on an evidence request.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_EVIDENCE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				requestId: { type: "string" },
				ownerUserId: { type: "string" },
				assigneeUserId: { type: "string" },
				managerUserId: { type: "string" },
			},
			required: ["requestId", "ownerUserId"],
		},
		handler: async (ctx, args) => ({
			result: await assignEvidenceOwner(
				actor(ctx),
				String(args.requestId ?? ""),
				String(args.ownerUserId ?? ""),
				args.assigneeUserId ? String(args.assigneeUserId) : undefined,
				args.managerUserId ? String(args.managerUserId) : undefined,
			),
		}),
	},
	{
		name: "update_evidence_status",
		description: "Move an evidence item through its status lifecycle.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.MANAGE_EVIDENCE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				requestId: { type: "string" },
				status: { type: "string" },
				note: { type: "string" },
			},
			required: ["requestId", "status"],
		},
		handler: async (ctx, args) => ({
			result: await updateEvidenceStatus(
				actor(ctx),
				String(args.requestId ?? ""),
				args.status as EvidenceStatus,
				args.note ? String(args.note) : undefined,
			),
		}),
	},
	{
		name: "evidence_coverage_report",
		description: "What evidence is still missing for a session or the org.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
		},
		handler: async (ctx, args) => ({
			result: await evidenceCoverageReport(
				ctx.orgId,
				args.sessionId ? String(args.sessionId) : undefined,
			),
		}),
	},
	{
		name: "who_owns_evidence",
		description: "Resolve owner and assignee for an evidence item.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { requestId: { type: "string" } },
			required: ["requestId"],
		},
		handler: async (ctx, args) => ({
			result: await whoOwnsEvidence(ctx.orgId, String(args.requestId ?? "")),
		}),
	},
	{
		name: "start_practice_round",
		description: "Start a solo AI-auditor practice round on a session.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.RUN_PRACTICE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				sessionId: { type: "string" },
				persona: { type: "string" },
				difficulty: { type: "string" },
			},
			required: ["sessionId"],
		},
		handler: async (ctx, args) => ({
			result: await startPracticeRound(
				actor(ctx),
				String(args.sessionId ?? ""),
				args.persona ? String(args.persona) : undefined,
				args.difficulty ? String(args.difficulty) : undefined,
			),
		}),
	},
	{
		name: "score_answer",
		description: "Score a practice answer. Honest unknowns score as acceptable.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.RUN_PRACTICE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				attemptId: { type: "string" },
				answer: { type: "string" },
				score: { type: "number" },
			},
			required: ["attemptId", "answer"],
		},
		handler: async (ctx, args) => ({
			result: await scoreAnswer(
				actor(ctx),
				String(args.attemptId ?? ""),
				String(args.answer ?? ""),
				Number(args.score ?? 3),
			),
		}),
	},
	{
		name: "request_feedback",
		description: "Request coaching feedback on a practice attempt.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.RUN_PRACTICE],
		mutating: true,
		parameters: {
			type: "object",
			properties: { attemptId: { type: "string" } },
			required: ["attemptId"],
		},
		handler: async (ctx, args) => ({
			result: await requestFeedback(actor(ctx), String(args.attemptId ?? "")),
		}),
	},
	{
		name: "find_rehearsal_gaps",
		description: "List captured rehearsal gaps and linked corrective actions.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
		},
		handler: async (ctx, args) => ({
			result: {
				gaps: await findRehearsalGaps(
					ctx.orgId,
					args.sessionId ? String(args.sessionId) : undefined,
				),
			},
		}),
	},
	{
		name: "session_readiness_report",
		description: "Return the post-session report (scores, gaps, coverage).",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { sessionId: { type: "string" } },
			required: ["sessionId"],
		},
		handler: async (ctx, args) => ({
			result: await sessionReadinessReport(
				actor(ctx),
				String(args.sessionId ?? ""),
			),
		}),
	},
	{
		name: "department_readiness_summary",
		description: "Department readiness vs practice coverage.",
		requiredPermissions: [PERMISSIONS.AUDIT_LAB.VIEW],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => ({
			result: await departmentReadinessSummary(ctx.orgId),
		}),
	},
];
