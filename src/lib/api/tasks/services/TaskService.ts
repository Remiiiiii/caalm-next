import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	CreateTaskInput,
	Task,
	TaskFilters,
	UpdateTaskInput,
} from "@/types/tasks";

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
			Query.limit(pagination.limit),
			Query.offset(pagination.offset),
		];

		if (filters.status) {
			queries.push(Query.equal("status", filters.status));
		}
		if (filters.assigneeId) {
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
		};

		if (input.description) payload.description = input.description;
		if (input.assigneeId) payload.assigneeId = input.assigneeId;
		if (input.dueDate) payload.dueDate = input.dueDate;
		if (input.department) payload.department = input.department;
		if (input.linkedEntityId) payload.linkedEntityId = input.linkedEntityId;

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

		const row = await tablesDB.updateRow({
			databaseId: TaskService.databaseId(),
			tableId: TaskService.tableId(),
			rowId: taskId,
			data: payload,
		});

		return row as unknown as Task;
	}

	static async deleteTask(orgId: string, taskId: string): Promise<boolean> {
		const existing = await TaskService.getTask(orgId, taskId);
		if (!existing) return false;

		const { tablesDB } = await createAdminClient();
		await tablesDB.deleteRow({
			databaseId: TaskService.databaseId(),
			tableId: TaskService.tableId(),
			rowId: taskId,
		});
		return true;
	}
}
