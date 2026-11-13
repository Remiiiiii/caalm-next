import { PERMISSIONS } from "@/constants/permissions";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import {
	hasAll,
	searchContractsTable,
	searchLicensesTable,
	summarizeTask,
} from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { getFinding } from "@/lib/audit-upload/store";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { isTaskOverdue } from "@/lib/tasks/dueDateDisplay";
import { resolveOrgTimezone } from "@/lib/timezone";

const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
type TaskPriority = (typeof TASK_PRIORITIES)[number];

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
				createdSource: "assistant",
				requestedById: ctx.user.$id,
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
				createdSource: "assistant",
				requestedById: ctx.user.$id,
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
	{
		name: "update_task",
		description:
			"Edit a task's title, description, due date, priority, or assignee (requires user confirmation). Find the task by taskId or by title among open tasks. If several or none match by title, say so and ask which one.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				taskId: { type: "string" },
				title: {
					type: "string",
					description:
						"Current title to search by, when taskId is not known. Required unless taskId is given.",
				},
				newTitle: { type: "string", description: "New title" },
				description: { type: "string" },
				dueDate: { type: "string", description: "ISO date" },
				priority: {
					type: "string",
					enum: TASK_PRIORITIES as unknown as string[],
				},
				assigneeId: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const taskId = String(args.taskId ?? "").trim();
			let task = taskId ? await TaskService.getTask(ctx.orgId, taskId) : null;
			if (!task) {
				const search = String(args.title ?? "").trim();
				if (!search) {
					return { result: { error: "Give the task id or its title." } };
				}
				const { tasks } = await TaskService.listTasks(
					ctx.orgId,
					{ search },
					{ limit: 10, offset: 0 },
				);
				if (tasks.length === 0) {
					return {
						result: { error: `I couldn't find a task matching "${search}".` },
					};
				}
				if (tasks.length > 1) {
					return {
						result: {
							error: `I found ${tasks.length} tasks matching "${search}": ${tasks
								.slice(0, 3)
								.map((t) => t.title)
								.join(", ")}. Tell me which one.`,
						},
					};
				}
				task = tasks[0];
			}

			const patch: {
				title?: string;
				description?: string;
				dueDate?: string;
				priority?: TaskPriority;
				assigneeId?: string;
			} = {};
			if (args.newTitle) patch.title = String(args.newTitle);
			if (args.description !== undefined) {
				patch.description = String(args.description);
			}
			if (args.dueDate) patch.dueDate = String(args.dueDate);
			if (TASK_PRIORITIES.includes(args.priority as TaskPriority)) {
				patch.priority = args.priority as TaskPriority;
			}
			if (args.assigneeId) patch.assigneeId = String(args.assigneeId);
			if (Object.keys(patch).length === 0) {
				return {
					result: {
						error:
							"Give at least one field to change (title, description, dueDate, priority, or assigneeId).",
					},
				};
			}

			const updated = await TaskService.updateTask(ctx.orgId, task.$id, patch);
			if (!updated) {
				return { result: { error: "That task could not be updated." } };
			}
			await logAuditEvent({
				event_id: `assistant_task_update_${task.$id}`,
				event_title: `Assistant updated task: ${updated.title}`,
				action: "update",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "task",
				target_id: task.$id,
				target_label: updated.title,
				summary: `CAALM assistant updated task "${updated.title}"`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return { result: { task: summarizeTask(updated) } };
		},
	},
	{
		name: "list_my_tasks",
		description:
			"List the current user's own tasks, optionally only the overdue ones. Requires events.create (same gate as other task tools). Read-only; scoped to the caller.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				overdueOnly: { type: "boolean" },
				status: {
					type: "string",
					description: "not_started, in_progress, blocked, done",
				},
				limit: { type: "number" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const limit = Math.min(Number(args.limit) || 25, 50);
			const { tasks } = await TaskService.listTasks(
				ctx.orgId,
				{
					assigneeId: ctx.user.$id,
					status: args.status ? String(args.status) : undefined,
				},
				{ limit: Math.min(limit * 2, 100), offset: 0 },
			);
			const timeZone = resolveOrgTimezone(undefined);
			const filtered = args.overdueOnly
				? tasks.filter((t) => isTaskOverdue(t.dueDate, t.status, timeZone))
				: tasks;
			const result = filtered.slice(0, limit);
			return {
				result: {
					tasks: result.map(summarizeTask),
					total: result.length,
					tasksHref: "/team/tasks",
				},
			};
		},
	},
	{
		name: "create_task_for_finding",
		description:
			"Create a task linked to a license or an audit finding (requires user confirmation). Give licenseId/licenseName for a license link, or findingId for an audit finding link.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				licenseId: { type: "string" },
				licenseName: {
					type: "string",
					description: "License name search, when licenseId is not known",
				},
				findingId: { type: "string" },
				title: { type: "string", description: "Task title" },
				dueDate: { type: "string", description: "ISO date" },
				priority: {
					type: "string",
					enum: TASK_PRIORITIES as unknown as string[],
				},
			},
			required: ["title"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const title = String(args.title ?? "").trim();
			if (!title) {
				return { result: { error: "Give the task a title." } };
			}
			const findingId = String(args.findingId ?? "").trim();
			const licenseId = String(args.licenseId ?? "").trim();
			const licenseName = String(args.licenseName ?? "").trim();

			let linkedEntityType: "license" | "audit" | undefined;
			let linkedEntityId: string | undefined;
			let linkedLabel = "";

			if (findingId) {
				const finding = await getFinding(ctx.orgId, findingId);
				if (!finding) {
					return {
						result: { error: `No audit finding found with id "${findingId}".` },
					};
				}
				linkedEntityType = "audit";
				linkedEntityId = finding.$id;
				linkedLabel = finding.title;
			} else if (licenseId || licenseName) {
				if (licenseId) {
					linkedEntityType = "license";
					linkedEntityId = licenseId;
					linkedLabel = licenseId;
				} else {
					const licenses = await searchLicensesTable(ctx, licenseName);
					if (licenses.length === 0) {
						return {
							result: {
								error: `I couldn't find a license matching "${licenseName}". Ask me to search licenses first.`,
							},
						};
					}
					if (licenses.length > 1) {
						return {
							result: {
								error: `I found ${licenses.length} licenses matching "${licenseName}": ${licenses
									.slice(0, 3)
									.map((l) => String(l.name))
									.join(", ")}. Tell me which one.`,
							},
						};
					}
					linkedEntityType = "license";
					linkedEntityId = String(licenses[0].id);
					linkedLabel = String(licenses[0].name);
				}
			} else {
				return {
					result: {
						error:
							"Give licenseId/licenseName for a license link, or findingId for an audit finding link.",
					},
				};
			}

			const priority = TASK_PRIORITIES.includes(args.priority as TaskPriority)
				? (args.priority as TaskPriority)
				: "medium";
			const task = await TaskService.createTask(ctx.orgId, ctx.user.$id, {
				title,
				description: `Linked to ${linkedEntityType}: ${linkedLabel}`,
				dueDate: args.dueDate ? String(args.dueDate) : undefined,
				priority,
				status: "not_started",
				linkedEntityType,
				linkedEntityId,
				createdSource: "assistant",
				requestedById: ctx.user.$id,
			});
			await logAuditEvent({
				event_id: `assistant_task_${task.$id}`,
				event_title: `Assistant created task: ${task.title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "task",
				target_id: task.$id,
				target_label: task.title,
				summary: `CAALM assistant created task ${task.title} linked to ${linkedEntityType} ${linkedLabel}`,
				metadata: { source: "ai_assistant", linkedEntityType, linkedEntityId },
			}).catch(() => undefined);
			return {
				result: {
					taskId: task.$id,
					title: task.title,
					linkedEntityType,
					linked: linkedLabel,
				},
			};
		},
	},
	{
		name: "cancel_task",
		description:
			"Cancel (soft-delete) a task so it no longer shows as active (requires user confirmation). Find the task by taskId or by title. If several or none match, say so and ask which one.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				taskId: { type: "string" },
				title: {
					type: "string",
					description: "Required unless taskId is given",
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const taskId = String(args.taskId ?? "").trim();
			let task = taskId ? await TaskService.getTask(ctx.orgId, taskId) : null;
			if (!task) {
				const search = String(args.title ?? "").trim();
				if (!search) {
					return { result: { error: "Give the task id or its title." } };
				}
				const { tasks } = await TaskService.listTasks(
					ctx.orgId,
					{ search },
					{ limit: 10, offset: 0 },
				);
				if (tasks.length === 0) {
					return {
						result: { error: `I couldn't find a task matching "${search}".` },
					};
				}
				if (tasks.length > 1) {
					return {
						result: {
							error: `I found ${tasks.length} tasks matching "${search}": ${tasks
								.slice(0, 3)
								.map((t) => t.title)
								.join(", ")}. Tell me which one.`,
						},
					};
				}
				task = tasks[0];
			}

			const cancelled = await TaskService.deleteTask(ctx.orgId, task.$id);
			if (!cancelled) {
				return { result: { error: "That task could not be cancelled." } };
			}
			await logAuditEvent({
				event_id: `assistant_task_cancel_${task.$id}`,
				event_title: `Assistant cancelled task: ${task.title}`,
				action: "delete",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "task",
				target_id: task.$id,
				target_label: task.title,
				summary: `CAALM assistant cancelled task "${task.title}"`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return {
				result: { taskId: task.$id, title: task.title, cancelled: true },
			};
		},
	},
];
