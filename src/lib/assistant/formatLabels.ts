/** Human-readable labels for assistant replies (never raw enums). */

const TASK_STATUS_LABELS: Record<string, string> = {
	not_started: "Not started",
	in_progress: "In progress",
	blocked: "Blocked",
	done: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
	low: "low priority",
	medium: "medium priority",
	high: "high priority",
	urgent: "urgent",
};

export function formatTaskStatus(status?: string | null): string {
	if (!status) return "Unknown status";
	return TASK_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function formatPriority(priority?: string | null): string | null {
	if (!priority) return null;
	return PRIORITY_LABELS[priority.toLowerCase()] ?? `${priority} priority`;
}

export function formatDueDate(dueDate?: string | null): string | null {
	if (!dueDate) return null;
	const d = new Date(dueDate);
	if (Number.isNaN(d.getTime())) return null;
	return `due ${d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	})}`;
}
