import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
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
];
