import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import {
	cancelReviewSession,
	inviteParticipants,
	listReviewSessions,
	rescheduleReviewSession,
	scheduleReviewSession,
} from "@/lib/audit-lab/service";
import type { SessionRole } from "@/lib/audit-lab/types";

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
					scheduledAt: args.scheduledAt ? String(args.scheduledAt) : undefined,
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
		description:
			"List Audit Lab review sessions for the caller's organization.",
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
				scheduledAt: { type: "string", description: "ISO datetime" },
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
			result: await inviteParticipants(
				actor(ctx),
				String(args.sessionId ?? ""),
				[
					{
						userId: String(args.userId ?? ""),
						name: args.name ? String(args.name) : undefined,
						role: (args.role as SessionRole) || "interviewee",
					},
				],
			),
		}),
	},
];
