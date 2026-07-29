/**
 * Tasks Schema
 * Organization-scoped compliance task assignments
 */

export type TaskStatus = "not_started" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskLinkedEntityType =
	| "contract"
	| "license"
	| "audit"
	| "calendar_event"
	| "none";

export interface Task {
	$id: string;
	orgId: string;
	title: string;
	description?: string;
	status: TaskStatus;
	priority: TaskPriority;
	assigneeId?: string;
	createdById: string;
	dueDate?: string;
	department?: string;
	linkedEntityType?: TaskLinkedEntityType;
	linkedEntityId?: string;
	completedAt?: string;
	$createdAt: string;
	$updatedAt: string;
}

export const TASK_ATTRIBUTES = [
	{ key: "orgId", type: "string" as const, size: 64, required: true },
	{ key: "title", type: "string" as const, size: 255, required: true },
	{ key: "description", type: "string" as const, size: 4000, required: false },
	{
		key: "status",
		type: "enum" as const,
		elements: ["not_started", "in_progress", "blocked", "done"],
		required: true,
	},
	{
		key: "priority",
		type: "enum" as const,
		elements: ["low", "medium", "high", "urgent"],
		required: true,
	},
	{ key: "assigneeId", type: "string" as const, size: 64, required: false },
	{ key: "createdById", type: "string" as const, size: 64, required: true },
	{ key: "dueDate", type: "datetime" as const, required: false },
	{ key: "department", type: "string" as const, size: 128, required: false },
	{
		key: "linkedEntityType",
		type: "enum" as const,
		elements: ["contract", "license", "audit", "calendar_event", "none"],
		required: false,
	},
	{ key: "linkedEntityId", type: "string" as const, size: 64, required: false },
	{ key: "completedAt", type: "datetime" as const, required: false },
] as const;
