import type {
	Task,
	TaskLinkedEntityType,
	TaskPriority,
	TaskStatus,
} from "@/lib/database/schemas/tasks.schema";

export type {
	Task,
	TaskLinkedEntityType,
	TaskPriority,
	TaskStatus,
} from "@/lib/database/schemas/tasks.schema";

export interface TaskFilters {
	status?: string;
	assigneeId?: string;
	department?: string;
	priority?: string;
	search?: string;
	dueBefore?: string;
	dueAfter?: string;
}

export interface CreateTaskInput {
	title: string;
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	assigneeId?: string;
	dueDate?: string;
	department?: string;
	linkedEntityType?: TaskLinkedEntityType;
	linkedEntityId?: string;
}

export interface UpdateTaskInput {
	title?: string;
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	assigneeId?: string | null;
	dueDate?: string | null;
	department?: string | null;
	linkedEntityType?: TaskLinkedEntityType;
	linkedEntityId?: string | null;
}
