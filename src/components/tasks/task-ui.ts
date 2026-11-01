import type {
	TaskLinkedEntityType,
	TaskPriority,
	TaskStatus,
} from "@/types/tasks";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	not_started: "Not started",
	in_progress: "In progress",
	blocked: "Blocked",
	done: "Done",
};

/** CAALM badge classes for task status (no dots, no truncate) */
export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
	not_started: "bg-slate-100 text-slate-600 border-slate-200",
	in_progress: "bg-blue/10 text-blue border-blue/20",
	blocked: "bg-orange/10 text-orange border-orange/20",
	done: "bg-green/10 text-green border-green/20",
};

export const CAALM_BADGE_BASE =
	"inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border whitespace-nowrap";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	urgent: "Urgent",
};

export const TASK_PRIORITY_FILLED: Record<TaskPriority, number> = {
	low: 1,
	medium: 2,
	high: 3,
	urgent: 3,
};

export const TASK_PRIORITY_BAR: Record<TaskPriority, string> = {
	low: "bg-slate-400",
	medium: "bg-orange",
	high: "bg-red",
	urgent: "bg-red",
};

export type TaskPerson = {
	id: string;
	name: string;
	imageUrl?: string | null;
	/** Role or department subtitle in assignee pickers */
	subtitle?: string | null;
	department?: string | null;
	division?: string | null;
	email?: string | null;
};

export const TASK_LINKED_BADGE = "bg-blue/10 text-blue border-blue/20";

export function linkedEntityIconHint(
	type?: TaskLinkedEntityType | null,
): "contract" | "license" | "audit" | "calendar" | "generic" {
	switch (type) {
		case "contract":
			return "contract";
		case "license":
			return "license";
		case "audit":
			return "audit";
		case "calendar_event":
			return "calendar";
		case "none":
		case undefined:
		case null:
			return "generic";
		default: {
			const _exhaustive: never = type;
			return _exhaustive;
		}
	}
}
