import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	isTaskDueThisWeek,
	isTaskOverdue,
} from "@/lib/tasks/dueDateDisplay";
import { formatTaskDisplayId } from "@/lib/tasks/formatTaskDisplayId";
import { resolveOrgTimezone } from "@/lib/timezone";
import type {
	CreateTaskInput,
	Task,
	TaskFilters,
	TaskListItem,
	TaskViewCounts,
	UpdateTaskInput,
} from "@/types/tasks";

const LIST_CAP = 200;

export class TaskService {
	private static tableId() {
		return appwriteConfig.tasksCollectionId || "tasks";
	}

	private static databaseId() {
		return appwriteConfig.databaseId!;
	}

	static async listTasks(
		orgId: string,
		filters: TaskFilters = {},
		pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
	): Promise<{ tasks: Task[]; total: number }> {
		const { tablesDB } = await createAdminClient();
		const queries = [
			Query.equal("orgId", orgId),
			Query.orderDesc("$createdAt"),
			Query.limit(Math.min(pagination.limit, LIST_CAP)),
			Query.offset(pagination.offset),
		];

		if (!filters.includeDeleted) {
			queries.push(Query.isNull("deletedAt"));
		}
		if (filters.status) {
			queries.push(Query.equal("status", filters.status));
		}
		if (filters.unassigned) {
			queries.push(Query.isNull("assigneeId"));
		} else if (filters.assigneeId) {
			queries.push(Query.equal("assigneeId", filters.assigneeId));
		}
		if (filters.department) {
			queries.push(Query.equal("department", filters.department));
		}
		if (filters.priority) {
			queries.push(Query.equal("priority", filters.priority));
		}
		if (filters.dueBefore) {
			queries.push(Query.lessThanEqual("dueDate", filters.dueBefore));
		}
		if (filters.dueAfter) {
			queries.push(Query.greaterThanEqual("dueDate", filters.dueAfter));
		}
		if (filters.search) {
			queries.push(Query.search("title", filters.search));
		}

		const result = await tablesDB.listRows({
			databaseId: TaskService.databaseId(),
			tableId: TaskService.tableId(),
			queries,
		});

		return {
			tasks: result.rows as unknown as Task[],
			total: result.total,
		};
	}

	static async listTasksForPage(
		orgId: string,
		filters: TaskFilters = {},
		pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
	): Promise<{
		tasks: TaskListItem[];
		total: number;
		counts: TaskViewCounts;
	}> {
		const timeZone = resolveOrgTimezone(filters.timeZone);
		const now = new Date();
		const { tasks } = await TaskService.listTasks(
			orgId,
			{
				...filters,
				unassigned:
					filters.unassigned || filters.assigneeId === "unassigned"
						? true
						: undefined,
				assigneeId:
					filters.view === "mine" ||
					filters.view === "unassigned" ||
					filters.assigneeId === "unassigned"
						? undefined
						: filters.assigneeId,
			},
			{ limit: LIST_CAP, offset: 0 },
		);

		const matchesDueBucket = (task: Task) => {
			if (!filters.dueBucket || filters.dueBucket === "any") return true;
			if (filters.dueBucket === "none") return !task.dueDate;
			if (filters.dueBucket === "overdue") {
				return isTaskOverdue(task.dueDate, task.status, timeZone, now);
			}
			return isTaskDueThisWeek(task.dueDate, task.status, timeZone, now);
		};

		const base = tasks.filter(matchesDueBucket);

		const counts: TaskViewCounts = {
			all: base.length,
			mine: base.filter((t) => t.assigneeId === filters.currentUserId).length,
			unassigned: base.filter((t) => !t.assigneeId).length,
			overdue: base.filter((t) =>
				isTaskOverdue(t.dueDate, t.status, timeZone, now),
			).length,
			dueThisWeek: base.filter((t) =>
				isTaskDueThisWeek(t.dueDate, t.status, timeZone, now),
			).length,
		};

		const viewed = base.filter((task) => {
			switch (filters.view) {
				case "mine":
					return task.assigneeId === filters.currentUserId;
				case "unassigned":
					return !task.assigneeId;
				case "overdue":
					return isTaskOverdue(task.dueDate, task.status, timeZone, now);
				case "due_this_week":
					return isTaskDueThisWeek(task.dueDate, task.status, timeZone, now);
				default:
					return true;
			}
		});

		const page = viewed.slice(
			pagination.offset,
			pagination.offset + pagination.limit,
		);
		const enriched = await TaskService.enrichTasks(orgId, page);

		return { tasks: enriched, total: viewed.length, counts };
	}

	static async getTask(orgId: string, taskId: string): Promise<Task | null> {
		const { tablesDB } = await createAdminClient();
		try {
			const row = await tablesDB.getRow({
				databaseId: TaskService.databaseId(),
				tableId: TaskService.tableId(),
				rowId: taskId,
			});
			const task = row as unknown as Task;
			if (task.orgId !== orgId) return null;
			return task;
		} catch {
			return null;
		}
	}

	static async getTaskListItem(
		orgId: string,
		taskId: string,
	): Promise<TaskListItem | null> {
		const task = await TaskService.getTask(orgId, taskId);
		if (!task) return null;
		const [item] = await TaskService.enrichTasks(orgId, [task]);
		return item ?? null;
	}

	static async createTask(
		orgId: string,
		createdById: string,
		input: CreateTaskInput,
	): Promise<Task> {
		const { tablesDB } = await createAdminClient();
		const payload: Record<string, unknown> = {
			orgId,
			createdById,
			title: input.title.trim(),
			status: input.status || "not_started",
			priority: input.priority || "medium",
			linkedEntityType: input.linkedEntityType || "none",
			createdSource: input.createdSource || "manual",
		};

		if (input.description) payload.description = input.description;
		if (input.assigneeId) payload.assigneeId = input.assigneeId;
		if (input.dueDate) payload.dueDate = input.dueDate;
		if (input.department) payload.department = input.department;
		if (input.linkedEntityId) payload.linkedEntityId = input.linkedEntityId;
		if (input.requestedById) payload.requestedById = input.requestedById;

		const row = await tablesDB.createRow({
			databaseId: TaskService.databaseId(),
			tableId: TaskService.tableId(),
			rowId: ID.unique(),
			data: payload,
		});

		return row as unknown as Task;
	}

	static async updateTask(
		orgId: string,
		taskId: string,
		input: UpdateTaskInput,
	): Promise<Task | null> {
		const existing = await TaskService.getTask(orgId, taskId);
		if (!existing) return null;

		const { tablesDB } = await createAdminClient();
		const payload: Record<string, unknown> = {};

		if (input.title !== undefined) payload.title = input.title.trim();
		if (input.description !== undefined) {
			payload.description = input.description ?? "";
		}
		if (input.status !== undefined) {
			payload.status = input.status;
			if (input.status === "done" && !existing.completedAt) {
				payload.completedAt = new Date().toISOString();
			}
		}
		if (input.priority !== undefined) payload.priority = input.priority;
		if (input.assigneeId !== undefined) {
			payload.assigneeId = input.assigneeId;
		}
		if (input.dueDate !== undefined) payload.dueDate = input.dueDate;
		if (input.department !== undefined) payload.department = input.department;
		if (input.linkedEntityType !== undefined) {
			payload.linkedEntityType = input.linkedEntityType;
		}
		if (input.linkedEntityId !== undefined) {
			payload.linkedEntityId = input.linkedEntityId;
		}
		if (input.deletedAt !== undefined) payload.deletedAt = input.deletedAt;
		if (input.createdSource !== undefined) {
			payload.createdSource = input.createdSource;
		}
		if (input.requestedById !== undefined) {
			payload.requestedById = input.requestedById;
		}

		const row = await tablesDB.updateRow({
			databaseId: TaskService.databaseId(),
			tableId: TaskService.tableId(),
			rowId: taskId,
			data: payload,
		});

		return row as unknown as Task;
	}

	static async deleteTask(orgId: string, taskId: string): Promise<Task | null> {
		return TaskService.updateTask(orgId, taskId, {
			deletedAt: new Date().toISOString(),
		});
	}

	static async restoreTask(orgId: string, taskId: string): Promise<Task | null> {
		const existing = await TaskService.getTask(orgId, taskId);
		if (!existing?.deletedAt) return null;
		return TaskService.updateTask(orgId, taskId, { deletedAt: null });
	}

	private static async enrichTasks(
		orgId: string,
		tasks: Task[],
	): Promise<TaskListItem[]> {
		const userIds = new Set<string>();
		for (const task of tasks) {
			if (task.assigneeId) userIds.add(task.assigneeId);
			if (task.requestedById) userIds.add(task.requestedById);
			if (task.createdById) userIds.add(task.createdById);
		}
		const names = await TaskService.lookupUserNames([...userIds]);
		const titles = await TaskService.lookupLinkedTitles(orgId, tasks);

		return tasks.map((task) => {
			const createdViaAssistant = task.createdSource === "assistant";
			const requestedId = task.requestedById || task.createdById;
			return {
				...task,
				assigneeName: task.assigneeId
					? names.get(task.assigneeId)
					: undefined,
				linkedEntityTitle: task.linkedEntityId
					? titles.get(`${task.linkedEntityType}:${task.linkedEntityId}`)
					: undefined,
				requestedByName: createdViaAssistant
					? names.get(requestedId)
					: undefined,
				createdViaAssistant,
				displayId: formatTaskDisplayId(task.$id),
			};
		});
	}

	private static async lookupUserNames(
		ids: string[],
	): Promise<Map<string, string>> {
		const map = new Map<string, string>();
		if (ids.length === 0) return map;
		const { tablesDB } = await createAdminClient();
		const tableId = appwriteConfig.usersCollectionId;
		if (!tableId) return map;

		await Promise.all(
			ids.map(async (id) => {
				try {
					const row = (await tablesDB.getRow({
						databaseId: TaskService.databaseId(),
						tableId,
						rowId: id,
					})) as { fullName?: string; name?: string; email?: string };
					map.set(id, row.fullName || row.name || row.email || "User");
				} catch {
					// id may be an auth account id — skip
				}
			}),
		);
		return map;
	}

	private static async lookupLinkedTitles(
		orgId: string,
		tasks: Task[],
	): Promise<Map<string, string>> {
		const map = new Map<string, string>();
		const { tablesDB } = await createAdminClient();

		const byType = new Map<string, string[]>();
		for (const task of tasks) {
			if (
				!task.linkedEntityId ||
				!task.linkedEntityType ||
				task.linkedEntityType === "none"
			) {
				continue;
			}
			const list = byType.get(task.linkedEntityType) ?? [];
			list.push(task.linkedEntityId);
			byType.set(task.linkedEntityType, list);
		}

		const tableFor = (type: string) => {
			switch (type) {
				case "contract":
					return {
						id: appwriteConfig.contractsCollectionId,
						field: "contractName",
					};
				case "license":
					return {
						id: appwriteConfig.licensesCollectionId,
						field: "licenseName",
					};
				case "calendar_event":
					return {
						id: appwriteConfig.calendarEventsCollectionId,
						field: "title",
					};
				case "audit":
					return { id: appwriteConfig.auditsCollectionId, field: "title" };
				default:
					return null;
			}
		};

		await Promise.all(
			[...byType.entries()].map(async ([type, ids]) => {
				const target = tableFor(type);
				if (!target?.id) return;
				const unique = [...new Set(ids)];
				await Promise.all(
					unique.map(async (rowId) => {
						try {
							const row = (await tablesDB.getRow({
								databaseId: TaskService.databaseId(),
								tableId: target.id,
								rowId,
							})) as Record<string, unknown>;
							if (row.orgId && row.orgId !== orgId) return;
							const title =
								(typeof row[target.field] === "string" && row[target.field]) ||
								(typeof row.title === "string" && row.title) ||
								(typeof row.name === "string" && row.name);
							if (typeof title === "string" && title.trim()) {
								map.set(`${type}:${rowId}`, title);
							}
						} catch {
							// missing linked row
						}
					}),
				);
			}),
		);

		return map;
	}
}
