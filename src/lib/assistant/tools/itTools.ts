import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { buildOrgITSnapshot } from "@/lib/it/org-it-snapshot";
import { getRunbook, listRunbooks } from "@/lib/it/runbooks/store";
import type { Runbook } from "@/lib/it/runbooks/types";

function summarizeRunbook(runbook: Runbook) {
	return {
		id: runbook.$id,
		title: runbook.title,
		slug: runbook.slug,
		summary: runbook.summary,
		service: runbook.service,
		severity: runbook.severity,
		stepCount: runbook.steps.length,
	};
}

export const IT_TOOLS: ToolDefinition[] = [
	{
		name: "search_runbooks",
		description:
			"Search IT runbooks and return a runbook's steps. Use action 'search' (default) to find runbooks, or 'get_step' with runbookId + stepIndex to return one step. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.IT.VIEW_RUNBOOKS],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["search", "get_step"] },
				query: { type: "string", description: "Free-text search" },
				service: { type: "string" },
				severity: {
					type: "string",
					enum: ["low", "medium", "high", "critical"],
				},
				runbookId: { type: "string" },
				stepIndex: {
					type: "number",
					description: "0-based step index, used with action 'get_step'",
				},
				limit: { type: "number" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.IT.VIEW_RUNBOOKS])) {
				return { result: { error: "Missing it.view_runbooks permission" } };
			}

			if (String(args.action ?? "search") === "get_step") {
				const runbookId = String(args.runbookId ?? "").trim();
				if (!runbookId) {
					return {
						result: { error: "Give the runbookId to get a step from." },
					};
				}
				const { item } = await getRunbook(ctx.orgId, runbookId);
				if (!item) {
					return {
						result: {
							error: `I couldn't find a runbook with id "${runbookId}".`,
						},
					};
				}
				const stepIndex = Number(args.stepIndex ?? 0);
				const step = item.steps[stepIndex];
				if (!step) {
					return {
						result: {
							error: `"${item.title}" only has ${item.steps.length} step(s).`,
						},
					};
				}
				return {
					result: {
						runbook: item.title,
						stepIndex,
						totalSteps: item.steps.length,
						step,
					},
				};
			}

			const limit = Math.min(Number(args.limit) || 10, 25);
			const { items } = await listRunbooks(ctx.orgId, {
				search: args.query ? String(args.query) : undefined,
				service: args.service ? String(args.service) : undefined,
				severity: args.severity as Runbook["severity"] | undefined,
				limit,
			});
			if (items.length === 0) {
				return {
					result: {
						runbooks: [],
						total: 0,
						message: "No matching runbooks found.",
					},
				};
			}
			return {
				result: { runbooks: items.map(summarizeRunbook), total: items.length },
			};
		},
	},
	{
		name: "get_system_health",
		description:
			"Return a read-only system-health snapshot for the org: plan limits, open/critical tickets, 2FA adoption, storage usage, and recent audit activity. Never exposes deployment controls, database management, or API keys. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.IT.VIEW_MONITORING],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.IT.VIEW_MONITORING])) {
				return { result: { error: "Missing it.view_monitoring permission" } };
			}
			const snapshot = await buildOrgITSnapshot(ctx.orgId);
			return { result: snapshot };
		},
	},
];
