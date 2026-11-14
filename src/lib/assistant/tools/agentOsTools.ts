import { PERMISSION_DEFINITIONS, PERMISSIONS } from "@/constants/permissions";
import {
	listUsersForManagement,
	updateUserProfile,
} from "@/lib/actions/user.actions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { getAuditLogs, logAuditEvent } from "@/lib/services/audit-logger";

function actorName(ctx: {
	user: { fullName?: string; name?: string | null; email?: string | null };
}): string {
	return (
		(ctx.user as { fullName?: string }).fullName ||
		ctx.user.name ||
		ctx.user.email ||
		"User"
	);
}

function asError(message: string) {
	return { result: { error: message } };
}

function plainPermissionLabel(key: string): {
	name: string;
	description: string;
} {
	const def = PERMISSION_DEFINITIONS.find((d) => d.key === key);
	return def
		? { name: def.name, description: def.description }
		: { name: key, description: key };
}

/** Registry access is deferred to avoid a module import cycle (registry imports this file too). */
async function loadRegistry() {
	return import("@/lib/assistant/tools/registry");
}

/**
 * Only tools with a captured, truly safe inverse go here. Everything else
 * honestly reports "not undoable" rather than guessing — see PTO 15.2.
 */
async function findUndoableAction(ctx: ToolContext) {
	const logs = await getAuditLogs({
		orgId: ctx.orgId,
		userId: ctx.user.$id,
		limit: 20,
	});
	return logs.find(
		(entry) =>
			(entry.metadata as Record<string, unknown> | undefined)?.source ===
				"ai_assistant" &&
			entry.target_type === "user" &&
			entry.action === "update" &&
			typeof (entry.metadata as Record<string, unknown>)?.previousStatus ===
				"string" &&
			typeof (entry.metadata as Record<string, unknown>)?.nextStatus ===
				"string",
	);
}

type SkillStep = {
	tool: string;
	buildArgs: (args: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * A fixed, reviewed set of named skills — not a general DSL. Each step is an
 * existing, already permission-gated ToolDefinition; adding a skill means
 * adding an entry here, not giving the assistant a workflow-building tool.
 */
const NAMED_SKILLS: Record<string, { label: string; steps: SkillStep[] }> = {
	create_and_assign_ticket: {
		label: "Create a ticket and assign it",
		steps: [
			{
				tool: "create_ticket",
				buildArgs: (args) => ({
					action: "create",
					title: args.title,
					description: args.description,
					category: args.category,
					impact: args.impact,
					urgency: args.urgency,
					problemPageUrl: args.problemPageUrl,
				}),
			},
			{
				tool: "assign_ticket",
				buildArgs: (args) => ({
					ticketId: args.ticketId,
					assigneeId: args.assigneeId,
					assigneeName: args.assigneeName,
				}),
			},
		],
	},
};

export const AGENT_OS_TOOLS: ToolDefinition[] = [
	{
		name: "preview_mutation",
		description:
			"Show what a mutating tool would do, without running it. Read-only.",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				toolName: { type: "string" },
				args: { type: "object" },
			},
			required: ["toolName"],
		},
		handler: async (ctx, args) => {
			const { ASSISTANT_TOOLS } = await loadRegistry();
			const target = ASSISTANT_TOOLS.find((t) => t.name === args.toolName);
			if (!target) {
				return asError(`I don't have a tool named "${args.toolName}".`);
			}
			if (!target.mutating) {
				return asError(
					`${target.name} doesn't change anything — there's nothing to preview, you can just ask for it directly.`,
				);
			}
			const missing = target.requiredPermissions.filter(
				(p) => !ctx.permissions.includes(p),
			);
			if (missing.length > 0) {
				const labels = missing.map((p) => plainPermissionLabel(p).name);
				return asError(
					`You can't run ${target.name} — missing permission${missing.length > 1 ? "s" : ""}: ${labels.join(", ")}.`,
				);
			}
			const callArgs =
				args.args && typeof args.args === "object"
					? (args.args as Record<string, unknown>)
					: {};
			return {
				result: {
					toolName: target.name,
					what: target.description,
					argsPreview: JSON.stringify(callArgs, null, 2).slice(0, 500),
					note: "Preview only — nothing has been changed. Ask me to run it to confirm and apply.",
				},
			};
		},
	},
	{
		name: "undo_last_action",
		description:
			"Reverse your own last action, only when it's safely reversible (today: reactivate/deactivate toggles). Confirm; audit the undo.",
		requiredPermissions: [PERMISSIONS.USERS.DEACTIVATE],
		mutating: true,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.DEACTIVATE])) {
				return asError("Missing users.deactivate permission");
			}
			const entry = await findUndoableAction(ctx);
			if (!entry) {
				return asError(
					"I didn't find a recent action of yours I can safely undo. Right now undo only covers reactivate/deactivate toggles.",
				);
			}
			const meta = entry.metadata as {
				previousStatus: "active" | "inactive" | "suspended";
				nextStatus: "active" | "inactive" | "suspended";
			};
			const users = await listUsersForManagement(ctx.orgId);
			const row = users.find((u) => u.$id === entry.target_id);
			if (!row) {
				return asError("That user no longer exists; nothing to undo.");
			}
			if (row.status !== meta.nextStatus) {
				return asError(
					"That account's status has changed since then — I won't undo a stale action. Use deactivate_user directly if you want to change it now.",
				);
			}
			const result = await updateUserProfile({
				accountId: row.accountId,
				status: meta.previousStatus,
			});
			if (!result?.user) {
				return asError(
					"Failed to undo — the account update didn't go through.",
				);
			}
			await logAuditEvent({
				event_id: `assistant_undo_${entry.event_id}_${Date.now()}`,
				event_title: `Assistant undid: ${entry.event_title}`,
				action: "update",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "governance",
				target_type: "user",
				target_id: row.$id,
				target_label: row.fullName || row.email,
				summary: `${actorName(ctx)} undid the last status change on ${row.fullName || row.email}`,
				metadata: {
					source: "ai_assistant",
					undoOf: entry.event_id,
					previousStatus: meta.nextStatus,
					nextStatus: meta.previousStatus,
				},
			}).catch(() => undefined);
			return {
				result: {
					undone: entry.event_title,
					user: row.fullName || row.email,
					status: meta.previousStatus,
				},
			};
		},
	},
	{
		name: "explain_why_denied",
		description:
			"Explain which permission is missing for a tool, in plain English, and who to ask. Never bypasses the permission. Read-only.",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: { toolName: { type: "string" } },
			required: ["toolName"],
		},
		handler: async (ctx, args) => {
			const { ASSISTANT_TOOLS } = await loadRegistry();
			const target = ASSISTANT_TOOLS.find((t) => t.name === args.toolName);
			if (!target) {
				return asError(`I don't have a tool named "${args.toolName}".`);
			}
			const missing = target.requiredPermissions.filter(
				(p) => !ctx.permissions.includes(p),
			);
			if (missing.length === 0) {
				return {
					result: {
						denied: false,
						message: `You already have every permission ${target.name} needs.`,
					},
				};
			}
			const details = missing.map((p) => plainPermissionLabel(p));
			return {
				result: {
					denied: true,
					toolName: target.name,
					missingPermissions: details,
					message: `${target.name} needs ${details.map((d) => `"${d.name}" (${d.description})`).join(" and ")}, which your account doesn't have. Ask your org admin to grant it — I can't bypass this.`,
				},
			};
		},
	},
	{
		name: "list_my_capabilities",
		description:
			"List what you're allowed to ask the assistant to do, based on your own permissions. Read-only.",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			const { getToolsForPermissions } = await loadRegistry();
			const tools = getToolsForPermissions(ctx.permissions);
			return {
				result: {
					count: tools.length,
					capabilities: tools.map((t) => ({
						name: t.name,
						description: t.description,
						mutating: t.mutating,
					})),
				},
			};
		},
	},
	{
		name: "compose_skill_multi_step",
		description:
			"Run a named, pre-reviewed multi-step skill made of existing tools (e.g. create_and_assign_ticket). Only skills in a fixed list are supported — this does not build arbitrary workflows.",
		requiredPermissions: [],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				skillName: {
					type: "string",
					enum: Object.keys(NAMED_SKILLS),
				},
				title: { type: "string" },
				description: { type: "string" },
				category: { type: "string" },
				impact: { type: "string" },
				urgency: { type: "string" },
				problemPageUrl: { type: "string" },
				assigneeId: { type: "string" },
				assigneeName: { type: "string" },
			},
			required: ["skillName"],
		},
		handler: async (ctx, args) => {
			const skillName = String(args.skillName ?? "");
			const skill = NAMED_SKILLS[skillName];
			if (!skill) {
				return asError(
					`"${skillName}" isn't a defined skill yet. Available: ${Object.keys(NAMED_SKILLS).join(", ")}.`,
				);
			}
			const { ASSISTANT_TOOLS, runToolByName } = await loadRegistry();
			const stepTools = skill.steps.map((step) => {
				const found = ASSISTANT_TOOLS.find((t) => t.name === step.tool);
				if (!found) throw new Error(`skill step tool "${step.tool}" missing`);
				return found;
			});
			const allRequired = [
				...new Set(stepTools.flatMap((t) => t.requiredPermissions)),
			];
			const missing = allRequired.filter((p) => !ctx.permissions.includes(p));
			if (missing.length > 0) {
				const labels = missing.map((p) => plainPermissionLabel(p).name);
				return asError(
					`You can't run "${skill.label}" — missing permission${missing.length > 1 ? "s" : ""}: ${labels.join(", ")}.`,
				);
			}

			const stepResults: Array<{ tool: string; result: unknown }> = [];
			for (const step of skill.steps) {
				const stepArgs = step.buildArgs(args);
				const outcome = await runToolByName(ctx, step.tool, stepArgs);
				const stepError =
					outcome.error ??
					(outcome.result as { error?: string } | undefined)?.error;
				if (stepError) {
					return {
						result: {
							skill: skill.label,
							completedSteps: stepResults,
							failedStep: step.tool,
							error: stepError,
						},
					};
				}
				stepResults.push({ tool: step.tool, result: outcome.result });
				// create_ticket's result carries the new ticket id forward to assign_ticket.
				const ticketId = (outcome.result as { ticketId?: string } | undefined)
					?.ticketId;
				if (ticketId) (args as Record<string, unknown>).ticketId = ticketId;
			}

			await logAuditEvent({
				event_id: `assistant_skill_${skillName}_${Date.now()}`,
				event_title: `Assistant ran skill: ${skill.label}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "skill_run",
				target_id: skillName,
				target_label: skill.label,
				summary: `${actorName(ctx)} ran the "${skill.label}" skill (${skill.steps.map((s) => s.tool).join(" → ")})`,
				metadata: {
					source: "ai_assistant",
					steps: skill.steps.map((s) => s.tool),
				},
			}).catch(() => undefined);

			return { result: { skill: skill.label, steps: stepResults } };
		},
	},
];
