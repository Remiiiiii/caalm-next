import { PERMISSIONS } from "@/constants/permissions";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import {
	hasAll,
	searchContractsTable,
	summarizeTask,
} from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { logAuditEvent } from "@/lib/services/audit-logger";

export const TASK_TOOLS: ToolDefinition[] = [
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
		name: "complete_task",
		description:
			"Mark a task as done (requires user confirmation). Find the task by title from the user's open tasks. If multiple or no tasks match, say so and ask the user which one.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				title: {
					type: "string",
					description: "The task title (or a distinctive part of it)",
				},
			},
			required: ["title"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const search = String(args.title ?? "").trim();
			if (!search)
				return { result: { error: "Which task should I mark done?" } };

			const { tasks } = await TaskService.listTasks(
				ctx.orgId,
				{ search },
				{ limit: 10, offset: 0 },
			);
			const open = tasks.filter((t) => t.status !== "done");

			if (open.length === 0) {
				return {
					result: {
						error: `I couldn't find an open task matching "${search}". Ask me to show your pending tasks first.`,
					},
				};
			}
			if (open.length > 1) {
				return {
					result: {
						error: `I found ${open.length} open tasks matching "${search}": ${open
							.slice(0, 3)
							.map((t) => t.title)
							.join(", ")}. Tell me which one.`,
					},
				};
			}

			const task = open[0];
			const updated = await TaskService.updateTask(ctx.orgId, task.$id, {
				status: "done",
			});
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			await logAuditEvent({
				event_id: `assistant_task_done_${task.$id}`,
				event_title: `Assistant completed task: ${task.title}`,
				action: "update",
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
				summary: `CAALM assistant marked task "${task.title}" done`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return {
				result: { taskId: task.$id, title: task.title, updated: !!updated },
			};
		},
	},
	{
		name: "create_task_for_contract",
		description:
			"Create a task linked to a contract (requires user confirmation). Use for follow-ups like 'remind me to review the Acme contract before it expires'. Find the contract by name.",
		requiredPermissions: [
			PERMISSIONS.EVENTS.CREATE,
			PERMISSIONS.CONTRACTS.VIEW,
		],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractName: {
					type: "string",
					description: "Contract name (or distinctive part)",
				},
				title: { type: "string", description: "Task title" },
				dueDate: { type: "string", description: "ISO date" },
				priority: { type: "string", enum: ["low", "medium", "high"] },
			},
			required: ["contractName", "title"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const search = String(args.contractName ?? "").trim();
			const contracts = await searchContractsTable(ctx, search);
			if (contracts.length === 0) {
				return {
					result: {
						error: `I couldn't find a contract matching "${search}". Ask me to search contracts first.`,
					},
				};
			}
			if (contracts.length > 1) {
				return {
					result: {
						error: `I found ${contracts.length} contracts matching "${search}": ${contracts
							.slice(0, 3)
							.map((c) => String(c.name))
							.join(", ")}. Tell me which one.`,
					},
				};
			}
			const contract = contracts[0];
			const task = await TaskService.createTask(ctx.orgId, ctx.user.$id, {
				title: String(args.title),
				description: `Linked to contract: ${contract.name}`,
				dueDate: args.dueDate ? String(args.dueDate) : undefined,
				priority: (args.priority as "low" | "medium" | "high") || "medium",
				status: "not_started",
				linkedEntityType: "contract",
				linkedEntityId: String(contract.id),
			});
			return {
				result: {
					taskId: task.$id,
					title: task.title,
					contract: contract.name,
				},
			};
		},
	},
];
