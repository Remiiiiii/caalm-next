import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { confirmAuditFinding } from "@/lib/audit-upload/confirm-finding";
import { getCap, updateCap } from "@/lib/audit-upload/store";
import { getAuditLogs } from "@/lib/services/audit-logger";

export const AUDIT_TOOLS: ToolDefinition[] = [
	{
		name: "list_audit_logs",
		description:
			"List recent audit/activity events for the organization (who changed what). Use when the user asks about recent activity, changes, or audit history. Requires audit view permission.",
		requiredPermissions: [PERMISSIONS.AUDIT.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				limit: { type: "number", description: "Max entries. Default 10." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.VIEW])) {
				return {
					result: {
						error:
							"You don't have permission to view audit logs. Ask an admin for audit access.",
					},
				};
			}
			const limit = Math.min(Number(args.limit) || 10, 20);
			const logs = await getAuditLogs({ orgId: ctx.orgId, limit });
			return {
				result: {
					logs: logs.map((l) => ({
						title: l.event_title,
						action: l.action,
						user: l.user_name,
						status: l.status,
						when: l.created_at,
						module: l.module,
						target_type: l.target_type,
					})),
					total: logs.length,
					auditHref: "/audits",
				},
			};
		},
	},
	{
		name: "confirm_finding",
		description:
			"Confirm a draft audit finding (may draft an Open corrective action). Requires audit.manage_findings.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_FINDINGS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				findingId: { type: "string" },
				documentId: { type: "string" },
				findingCode: { type: "string" },
				title: { type: "string" },
			},
			required: ["findingId", "documentId"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_FINDINGS])) {
				return {
					result: {
						error:
							"You cannot confirm findings. Ask an admin for that permission.",
					},
				};
			}
			const findingId = String(args.findingId ?? "");
			const result = await confirmAuditFinding({
				orgId: ctx.orgId,
				user: ctx.user,
				findingId,
			});
			if (!result.ok) {
				return { result: { error: result.error } };
			}
			const href = `/audits/upload/${result.finding.documentId}#finding-${result.finding.$id}`;
			return {
				result: {
					findingId: result.finding.$id,
					documentId: result.finding.documentId,
					findingCode: result.finding.findingCode,
					title: result.finding.title,
					status: result.finding.status,
					capId: result.cap?.$id ?? null,
					capStatus: result.cap?.status ?? null,
					draftedCap: result.draftedCap,
					continueRemediation: true,
					href,
				},
			};
		},
	},
	{
		name: "apply_audit_remediation",
		description:
			"Start an open corrective action (status Open → In progress). Never closes a CAP. Requires audit.manage_caps.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_CAPS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				capId: { type: "string" },
				findingId: { type: "string" },
				documentId: { type: "string" },
				nextStatus: { type: "string" },
			},
			required: ["capId", "findingId", "documentId"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_CAPS])) {
				return {
					result: {
						error:
							"You cannot change corrective actions. Ask an admin for that permission.",
					},
				};
			}
			const capId = String(args.capId ?? "");
			const cap = await getCap(ctx.orgId, capId);
			if (!cap) {
				return { result: { error: "Corrective action not found." } };
			}
			if (cap.findingId !== String(args.findingId ?? cap.findingId)) {
				return { result: { error: "Finding does not match this action." } };
			}
			if (cap.status !== "open") {
				return {
					result: {
						error:
							"This corrective action is not open, so it cannot be started from Ask CAALM.",
					},
				};
			}
			const updated = await updateCap(capId, { status: "in_progress" });
			await logAuditUploadEvent({
				user: ctx.user,
				orgId: ctx.orgId,
				action: "update",
				summary: `Started corrective action ${cap.title} from Ask CAALM`,
				targetId: capId,
				targetLabel: cap.title,
				targetType: "audit_cap",
			});
			return {
				result: {
					capId: updated.$id,
					title: updated.title,
					status: updated.status,
					previousStatus: "open",
					href: `/audits/upload/${cap.documentId}#finding-cap-${cap.findingId}`,
				},
			};
		},
	},
];
