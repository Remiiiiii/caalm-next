import {
	daysUntilDateOnly,
	formatInTimezone,
	resolveOrgTimezone,
} from "@/lib/timezone";

export type TaskDueTone = "overdue" | "today" | "soon" | "default" | "none";

export type TaskDueDisplay = {
	label: string;
	relative: string;
	tone: TaskDueTone;
	showAlert: boolean;
	daysUntil: number | null;
};

/** Overdue / due-today labels use the org timezone, not the browser clock. */
export function getTaskDueDisplay(params: {
	dueDate?: string | null;
	status?: string;
	timeZone?: string | null;
	now?: Date;
}): TaskDueDisplay {
	const { dueDate, status, now = new Date() } = params;
	const timeZone = resolveOrgTimezone(params.timeZone);

	if (!dueDate) {
		return {
			label: "—",
			relative: "",
			tone: "none",
			showAlert: false,
			daysUntil: null,
		};
	}

	const daysUntil = daysUntilDateOnly(dueDate, now, timeZone);
	const dateKey = dueDate.split("T")[0] || "";
	const label = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
		? formatInTimezone(`${dateKey}T12:00:00.000Z`, "MMM d, yyyy", "UTC")
		: "—";

	if (Number.isNaN(daysUntil)) {
		return {
			label: "—",
			relative: "",
			tone: "none",
			showAlert: false,
			daysUntil: null,
		};
	}

	if (status === "done") {
		return {
			label,
			relative: "",
			tone: "default",
			showAlert: false,
			daysUntil,
		};
	}

	if (daysUntil < 0) {
		const n = Math.abs(daysUntil);
		return {
			label,
			relative: n === 1 ? "1 day overdue" : `${n} days overdue`,
			tone: "overdue",
			showAlert: true,
			daysUntil,
		};
	}

	if (daysUntil === 0) {
		return {
			label,
			relative: "Due today",
			tone: "today",
			showAlert: false,
			daysUntil,
		};
	}

	if (daysUntil === 1) {
		return {
			label,
			relative: "Tomorrow",
			tone: "soon",
			showAlert: false,
			daysUntil,
		};
	}

	return {
		label,
		relative: `In ${daysUntil} days`,
		tone: "default",
		showAlert: false,
		daysUntil,
	};
}

export function isTaskOverdue(
	dueDate: string | undefined,
	status: string | undefined,
	timeZone: string,
	now = new Date(),
): boolean {
	if (!dueDate || status === "done") return false;
	const days = daysUntilDateOnly(dueDate, now, timeZone);
	return !Number.isNaN(days) && days < 0;
}

export function isTaskDueThisWeek(
	dueDate: string | undefined,
	status: string | undefined,
	timeZone: string,
	now = new Date(),
): boolean {
	if (!dueDate || status === "done") return false;
	const days = daysUntilDateOnly(dueDate, now, timeZone);
	return !Number.isNaN(days) && days >= 0 && days <= 7;
}
