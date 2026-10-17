/**
 * Build pending / completed / failed action cards for the assistant UI.
 */

import type {
	AssistantActionField,
	AssistantActionLifecycle,
	AssistantPendingAction,
} from "@/components/assistant/assistantTypes";
import {
	formatActionDateLong,
	formatActionDateShort,
	formatActionTimeRange,
} from "@/lib/assistant/actionCompleted";
import {
	flattenResultFields,
	formatActionValue,
} from "@/lib/assistant/formatActionValue";

const HIDDEN_RESULT_KEYS = new Set([
	"eventId",
	"eventid",
	"$id",
	"id",
	"calendarHref",
	"pendingApproval",
	"note",
	"conflicts",
	"invitedCount",
	"previousDate",
	"previousStartTime",
	"previousEndTime",
	"tasksHref",
]);

export type ActionActor = {
	userId?: string;
	name?: string;
	avatar?: string | null;
	department?: string;
	departmentLabel?: string;
};

function actionLabelForTool(toolName: string, fallbackLabel: string): string {
	const map: Record<string, string> = {
		create_task: "Create task",
		create_task_for_contract: "Create task",
		complete_task: "Complete task",
		create_calendar_event: "Schedule meeting",
		reschedule_calendar_event: "Move event",
		cancel_calendar_event: "Cancel event",
		generate_report: "Generate report",
	};
	return map[toolName] ?? (fallbackLabel.replace(/^Confirm\s+/i, "") || "Action");
}

function humanizeStatus(raw: unknown): string {
	const s = String(raw ?? "")
		.trim()
		.toLowerCase();
	if (!s || s === "not_started") return "Open";
	if (s === "in_progress") return "In progress";
	if (s === "done" || s === "completed") return "Done";
	return formatActionValue(raw) || "Open";
}

function humanizePriority(raw: unknown): string {
	const s = String(raw ?? "")
		.trim()
		.toLowerCase();
	if (!s) return "Medium";
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDue(raw: unknown): string {
	if (typeof raw !== "string" || !raw.trim()) return "";
	if (raw.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(raw)) {
		return formatActionDateLong(raw).replace(/^[A-Za-z]{3},\s*/, "");
	}
	return raw;
}

function entityTitleFromArgs(
	toolName: string,
	args: Record<string, unknown>,
): string {
	if (toolName.includes("calendar") || toolName.includes("event")) {
		return String(args.title ?? args.eventTitle ?? "Untitled");
	}
	const title = String(args.title ?? args.eventTitle ?? "").trim();
	if (
		toolName === "create_task" ||
		toolName === "create_task_for_contract"
	) {
		return title; // empty title = blank draft field in the UI
	}
	return title || "Untitled";
}

function buildPendingFields(
	toolName: string,
	args: Record<string, unknown>,
	actor?: ActionActor,
): AssistantActionField[] {
	const fields: AssistantActionField[] = [];

	if (
		toolName === "create_task" ||
		toolName === "create_task_for_contract" ||
		toolName === "complete_task"
	) {
		if (actor?.name) {
			fields.push({
				label: "Assignee",
				value: actor.name,
				kind: "assignee",
				assignee: {
					name: actor.name,
					userId: actor.userId,
					avatar: actor.avatar,
				},
			});
		}
		const due = formatDue(args.dueDate);
		fields.push({
			label: "Due date",
			value: due || "Not set",
		});
		fields.push({
			label: "Priority",
			value: humanizePriority(args.priority),
			kind: "badge",
			badgeTone: "slate",
		});
		fields.push({
			label: "Status",
			value: humanizeStatus(args.status ?? "not_started"),
			kind: "badge",
			badgeTone: "green",
		});
		const dept = actor?.departmentLabel || actor?.department;
		if (dept) fields.push({ label: "Department", value: String(dept) });
		if (args.contractName) {
			fields.push({
				label: "Contract",
				value: formatActionValue(args.contractName),
			});
		}
		if (
			typeof args.description === "string" &&
			args.description.trim() &&
			toolName !== "create_task" &&
			toolName !== "create_task_for_contract"
		) {
			fields.push({
				label: "Description",
				value: args.description.trim(),
			});
		}
		return fields;
	}

	if (toolName === "reschedule_calendar_event") {
		const newDate = args.newDate ? formatDue(args.newDate) : "";
		const newTime = formatActionTimeRange(
			typeof args.newStartTime === "string" ? args.newStartTime : undefined,
			typeof args.newEndTime === "string" ? args.newEndTime : undefined,
		);
		if (newDate) fields.push({ label: "Date", value: newDate });
		if (newTime && newTime !== "Time TBD") {
			fields.push({ label: "Time", value: newTime });
		}
		return fields;
	}

	if (toolName === "create_calendar_event") {
		const date = formatDue(args.date);
		if (date) fields.push({ label: "Date", value: date });
		fields.push({
			label: "Time",
			value: formatActionTimeRange(
				typeof args.startTime === "string" ? args.startTime : undefined,
				typeof args.endTime === "string" ? args.endTime : undefined,
			),
		});
		return fields;
	}

	for (const [key, value] of Object.entries(args)) {
		if (value === undefined || value === null) continue;
		if (String(value).trim() === "") continue;
		const label = key
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (c) => c.toUpperCase())
			.trim();
		fields.push({ label, value: formatActionValue(value) });
	}
	return fields.slice(0, 8);
}

export function buildPendingActionLifecycle(
	pending: AssistantPendingAction,
	actor?: ActionActor,
): AssistantActionLifecycle {
	const args = pending.args ?? {};
	return {
		state: "pending",
		actionLabel: actionLabelForTool(pending.toolName, pending.label),
		entityTitle: entityTitleFromArgs(pending.toolName, args),
		entitySubtitle: "ID assigned on creation",
		toolName: pending.toolName,
		pendingActionId: pending.id,
		fields: buildPendingFields(pending.toolName, args, actor),
		footerNote: "Nothing has changed yet.",
	};
}

export function buildCompletedActionLifecycle(params: {
	pending: AssistantPendingAction;
	result: Record<string, unknown> | null;
	actor?: ActionActor;
}): AssistantActionLifecycle {
	const { pending, result, actor } = params;
	const args = pending.args ?? {};
	const base = buildPendingActionLifecycle(pending, actor);

	if (pending.toolName === "reschedule_calendar_event" && result) {
		const title = String(result.title ?? args.eventTitle ?? "Meeting");
		const prevDate =
			typeof result.previousDate === "string"
				? formatDue(result.previousDate)
				: "";
		const nextDate =
			typeof result.date === "string" ? formatDue(result.date) : "";
		const prevTime = formatActionTimeRange(
			typeof result.previousStartTime === "string"
				? result.previousStartTime
				: undefined,
			typeof result.previousEndTime === "string"
				? result.previousEndTime
				: undefined,
		);
		const nextTime = formatActionTimeRange(
			typeof result.startTime === "string" ? result.startTime : undefined,
			typeof result.endTime === "string" ? result.endTime : undefined,
		);
		const invited =
			typeof result.invitedCount === "number"
				? result.invitedCount
				: undefined;

		const fields: AssistantActionField[] = [];
		if (nextDate || prevDate) {
			fields.push({
				label: "Date",
				value: nextDate || prevDate,
				previousValue:
					prevDate && nextDate && prevDate !== nextDate ? prevDate : undefined,
			});
		}
		if (nextTime !== "Time TBD" || prevTime !== "Time TBD") {
			fields.push({
				label: "Time",
				value: nextTime !== "Time TBD" ? nextTime : prevTime,
				previousValue:
					prevTime !== "Time TBD" &&
					nextTime !== "Time TBD" &&
					prevTime !== nextTime
						? prevTime
						: undefined,
			});
		}
		if (typeof invited === "number" && invited > 0) {
			fields.push({
				label: "Invitees",
				value: `${invited} notified`,
			});
		}

		const eventId =
			typeof result.eventId === "string" ? result.eventId : undefined;
		return {
			state: "completed",
			actionLabel: "Move event",
			entityTitle: title,
			entitySubtitle: eventId
				? `EVT-${eventId.slice(-6)}`
				: formatActionDateShort(String(result.date ?? "")),
			entityHref: "/calendar",
			entityHrefLabel: "View event",
			toolName: pending.toolName,
			fields,
			footerNote: new Date().toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
			}),
		};
	}

	if (
		(pending.toolName === "create_task" ||
			pending.toolName === "create_task_for_contract") &&
		result
	) {
		const task =
			result.task && typeof result.task === "object"
				? (result.task as Record<string, unknown>)
				: result;
		const title = String(task.title ?? args.title ?? "Task");
		const taskId = typeof task.$id === "string" ? task.$id : undefined;
		const fields = buildPendingFields(
			pending.toolName,
			{
				...args,
				dueDate: task.dueDate ?? args.dueDate,
				priority: task.priority ?? args.priority,
				status: task.status ?? "not_started",
			},
			actor,
		);
		if (task.project || result.project) {
			fields.push({
				label: "Project",
				value: formatActionValue(task.project ?? result.project),
			});
		}
		if (task.tags || result.tags) {
			fields.push({
				label: "Tags",
				value: formatActionValue(task.tags ?? result.tags),
			});
		}
		return {
			state: "completed",
			actionLabel: "Create task",
			entityTitle: title,
			entitySubtitle: taskId
				? `TSK-${taskId.slice(-4).toUpperCase()}`
				: undefined,
			entityHref: "/team/tasks",
			entityHrefLabel: "View task",
			toolName: pending.toolName,
			fields,
			footerNote: new Date().toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
			}),
		};
	}

	const flat = result
		? flattenResultFields(result, HIDDEN_RESULT_KEYS)
		: [];
	const fields: AssistantActionField[] =
		flat.length > 0
			? flat.map((row) => ({
					label: row.label,
					value: row.value,
				}))
			: base.fields;

	return {
		state: "completed",
		actionLabel: base.actionLabel,
		entityTitle: entityTitleFromArgs(pending.toolName, {
			...args,
			...(result ?? {}),
		}),
		entitySubtitle: undefined,
		toolName: pending.toolName,
		fields,
		footerNote: new Date().toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		}),
	};
}

export function buildFailedActionLifecycle(params: {
	pending: AssistantPendingAction;
	errorMessage: string;
	errorCode?: string;
	actor?: ActionActor;
}): AssistantActionLifecycle {
	const base = buildPendingActionLifecycle(params.pending, params.actor);
	return {
		...base,
		state: "failed",
		entitySubtitle: base.entitySubtitle ?? "ID assigned on creation",
		errorMessage: params.errorMessage,
		errorCode: params.errorCode,
		retrySafe: true,
		footerNote: "Safe to retry — no duplicate will be created.",
		pendingActionId: params.pending.id,
	};
}
