import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { listCalendarApprovalRequests } from "@/lib/actions/calendar-approval.actions";
import { generateReport } from "@/lib/actions/report.actions";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { retrieveKnowledge } from "@/lib/assistant/knowledge/retrieve";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { logAuditEvent } from "@/lib/services/audit-logger";

function hasAll(
	ctx: ToolContext,
	keys: Parameters<typeof ctx.permissions.includes>[0][],
): boolean {
	return keys.every((k) => ctx.permissions.includes(k));
}

function summarizeTask(task: {
	$id: string;
	title: string;
	status: string;
	priority?: string;
	dueDate?: string | null;
	assigneeId?: string | null;
}) {
	return {
		id: task.$id,
		title: task.title,
		status: task.status,
		priority: task.priority,
		dueDate: task.dueDate ?? null,
		assigneeId: task.assigneeId ?? null,
	};
}

async function searchContractsTable(ctx: ToolContext, search: string) {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.contractsCollectionId || "contracts";
	const q = search.trim();
	const queries = [
		Query.equal("orgId", ctx.orgId),
		...(q ? [Query.contains("contractName", q)] : []),
		Query.orderDesc("$createdAt"),
		Query.limit(8),
	];
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId,
		queries,
	});
	return result.rows.map((r: Record<string, unknown>) => ({
		id: r.$id,
		name: r.contractName ?? r.name,
		status: r.status,
		expiryDate: r.expiryDate,
	}));
}

async function searchLicensesTable(ctx: ToolContext, search: string) {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.licensesCollectionId || "licenses";
	const q = search.trim();
	const queries = [
		Query.equal("orgId", ctx.orgId),
		...(q ? [Query.contains("licenseName", q)] : []),
		Query.orderDesc("$createdAt"),
		Query.limit(8),
	];
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId,
		queries,
	});
	return result.rows.map((r: Record<string, unknown>) => ({
		id: r.$id,
		name: r.licenseName ?? r.name,
		status: r.status,
		expirationDate: r.expirationDate,
	}));
}

export const ASSISTANT_TOOLS: ToolDefinition[] = [
	{
		name: "get_page_help",
		description: "Get CAALM product help for the current page or a topic",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				topic: { type: "string", description: "User question or topic" },
			},
			required: ["topic"],
		},
		handler: async (ctx, args) => {
			const topic = String(args.topic ?? "");
			const { contextText, sources } = retrieveKnowledge(topic, ctx.pathname);
			return { result: { contextText, sources } };
		},
	},
	{
		name: "navigate",
		description: "Suggest an in-app navigation path for the user",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				href: { type: "string", description: "Internal path e.g. /contracts" },
			},
			required: ["href"],
		},
		handler: async (_ctx, args) => {
			const href = String(args.href ?? "");
			if (!href.startsWith("/")) {
				return { result: { error: "Invalid path" } };
			}
			return { clientAction: { type: "navigate", href }, result: { href } };
		},
	},
	{
		name: "search_contracts",
		description: "Search contracts in the user's organization",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return { result: { error: "Missing contracts.view permission" } };
			}
			const rows = await searchContractsTable(ctx, String(args.query ?? ""));
			return { result: { contracts: rows } };
		},
	},
	{
		name: "search_licenses",
		description: "Search licenses in the user's organization",
		requiredPermissions: [PERMISSIONS.LICENSES.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.VIEW])) {
				return { result: { error: "Missing licenses.view permission" } };
			}
			const rows = await searchLicensesTable(ctx, String(args.query ?? ""));
			return { result: { licenses: rows } };
		},
	},
	{
		name: "list_tasks",
		description:
			"List real tasks from the CAALM Tasks API (/team/tasks). Use this whenever the user asks to show, list, or find pending/open/assigned tasks. Do not use product docs or Analytics links for this.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				search: { type: "string", description: "Optional title search" },
				status: {
					type: "string",
					description:
						"Optional status filter: not_started, in_progress, blocked, done. Omit for pending (all except done).",
				},
				pendingOnly: {
					type: "string",
					description:
						"Set to true to return open/pending tasks (not_started, in_progress, blocked).",
				},
				limit: { type: "number" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const limit = Math.min(Number(args.limit) || 15, 25);
			const pendingOnly =
				String(args.pendingOnly ?? "true").toLowerCase() !== "false" &&
				!args.status;
			const status = args.status ? String(args.status) : undefined;

			if (status && !pendingOnly) {
				const { tasks, total } = await TaskService.listTasks(
					ctx.orgId,
					{
						status,
						search: args.search ? String(args.search) : undefined,
					},
					{ limit, offset: 0 },
				);
				return {
					result: {
						tasks: tasks.map(summarizeTask),
						total,
						tasksHref: "/team/tasks",
					},
				};
			}

			// Pending = all non-done statuses
			const statuses = ["not_started", "in_progress", "blocked"] as const;
			const batches = await Promise.all(
				statuses.map((s) =>
					TaskService.listTasks(
						ctx.orgId,
						{
							status: s,
							search: args.search ? String(args.search) : undefined,
						},
						{ limit, offset: 0 },
					),
				),
			);
			const tasks = batches
				.flatMap((b) => b.tasks)
				.sort((a, b) => {
					const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
					const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
					return aDue - bDue;
				})
				.slice(0, limit);

			return {
				result: {
					tasks: tasks.map(summarizeTask),
					total: tasks.length,
					tasksHref: "/team/tasks",
				},
			};
		},
	},
	{
		name: "create_task",
		description: "Create a task (requires user confirmation before execution)",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				dueDate: { type: "string", description: "ISO date" },
				priority: { type: "string", enum: ["low", "medium", "high"] },
			},
			required: ["title"],
		},
		handler: async (ctx, args) => {
			const task = await TaskService.createTask(ctx.orgId, ctx.user.$id, {
				title: String(args.title),
				description: args.description ? String(args.description) : undefined,
				dueDate: args.dueDate ? String(args.dueDate) : undefined,
				priority: (args.priority as "low" | "medium" | "high") || "medium",
				status: "not_started",
			});
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			await logAuditEvent({
				event_id: `assistant_task_${task.$id}`,
				event_title: `Assistant created task: ${task.title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "task",
				target_id: task.$id,
				target_label: task.title,
				summary: `CAALM assistant created task ${task.title}`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return { result: { task } };
		},
	},
	{
		name: "list_pending_approvals",
		description: "List pending calendar approval requests",
		requiredPermissions: [PERMISSIONS.EVENTS.APPROVE],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.APPROVE])) {
				return { result: { error: "Missing events.approve permission" } };
			}
			const approvals = await listCalendarApprovalRequests({
				status: "pending",
			});
			return { result: { approvals: approvals.slice(0, 15) } };
		},
	},
	{
		name: "generate_report",
		description: "Start an AI report generation for the user's department",
		requiredPermissions: [PERMISSIONS.SETTINGS.VIEW],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				department: { type: "string" },
			},
			required: ["department"],
		},
		handler: async (ctx, args) => {
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			const division =
				(ctx.user.prefs as { division?: string })?.division ||
				String(args.department ?? "General");
			const report = await generateReport({
				userId: ctx.user.$id,
				department: String(args.department ?? division),
				userName,
			});
			await logAuditEvent({
				event_id: `assistant_report_${report.$id}`,
				event_title: `Assistant started report: ${report.title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "report",
				target_id: report.$id,
				target_label: report.title,
				summary: `CAALM assistant started report generation`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return { result: { reportId: report.$id, status: report.status } };
		},
	},
];

export function getToolsForPermissions(
	permissions: ToolContext["permissions"],
) {
	return ASSISTANT_TOOLS.filter((tool) =>
		tool.requiredPermissions.every((p) => permissions.includes(p)),
	);
}

export async function runToolByName(
	ctx: ToolContext,
	toolName: string,
	args: Record<string, unknown>,
): Promise<{
	result?: unknown;
	clientAction?: { type: "navigate"; href: string };
	error?: string;
}> {
	const tool = ASSISTANT_TOOLS.find((t) => t.name === toolName);
	if (!tool) return { error: "Unknown tool" };
	if (!tool.requiredPermissions.every((p) => ctx.permissions.includes(p))) {
		return { error: "Insufficient permissions for tool" };
	}
	return tool.handler(ctx, args);
}
