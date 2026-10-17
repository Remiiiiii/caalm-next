import type {
	TaskCreatedSource,
	TaskLinkedEntityType,
	TaskPriority,
	TaskStatus,
} from "@/lib/database/schemas/tasks.schema";

export type {
	Task,
	TaskCreatedSource,
	TaskLinkedEntityType,
	TaskPriority,
	TaskStatus,
} from "@/lib/database/schemas/tasks.schema";

export type TaskView = "all" | "mine" | "unassigned" | "overdue" | "due_this_week";
export type TaskDueBucket = "any" | "overdue" | "next_7" | "none";

export interface TaskFilters {
	status?: string;
	assigneeId?: string;
	unassigned?: boolean;
	department?: string;
	priority?: string;
	search?: string;
	dueBefore?: string;
	dueAfter?: string;
	view?: TaskView;
	dueBucket?: TaskDueBucket;
	includeDeleted?: boolean;
	currentUserId?: string;
	timeZone?: string;
}

export interface TaskViewCounts {
	all: number;
	mine: number;
	unassigned: number;
	overdue: number;
	dueThisWeek: number;
}

export interface TaskListItem {
	$id: string;
	orgId: string;
	title: string;
	description?: string;
	status: TaskStatus;
	priority: TaskPriority;
	assigneeId?: string;
	assigneeName?: string;
	createdById: string;
	dueDate?: string;
	department?: string;
	linkedEntityType?: TaskLinkedEntityType;
	linkedEntityId?: string;
	linkedEntityTitle?: string;
	completedAt?: string;
	deletedAt?: string;
	createdSource?: TaskCreatedSource;
	requestedById?: string;
	requestedByName?: string;
	createdViaAssistant: boolean;
	displayId: string;
	$createdAt: string;
	$updatedAt: string;
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
	createdSource?: TaskCreatedSource;
	requestedById?: string;
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
	deletedAt?: string | null;
	createdSource?: TaskCreatedSource;
	requestedById?: string | null;
}
