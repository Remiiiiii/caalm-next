import {
	createCalendarEvent,
} from "@/lib/actions/calendar.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import CacheManager from "@/lib/services/cache-manager";
import { triggerTaskAssignedNotification } from "@/lib/utils/notificationTriggers";
import type { Task } from "@/types/tasks";

function toDateOnly(isoOrDate: string): string {
	const match = isoOrDate.match(/^(\d{4}-\d{2}-\d{2})/);
	if (match) return match[1];
	const d = new Date(isoOrDate);
	if (Number.isNaN(d.getTime())) {
		throw new Error(`Invalid due date: ${isoOrDate}`);
	}
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/**
 * When a task is created with both assignee and due date:
 * 1. Create a deadline calendar event for the assignee
 * 2. Link the task to that event
 * 3. Notify the assignee
 *
 * Failures are logged and do not fail task creation.
 */
export async function applyTaskAssignmentSideEffects({
	task,
	createdByUserId,
	createdByAccountId,
	assignerName,
}: {
	task: Task;
	createdByUserId: string;
	createdByAccountId: string;
	assignerName: string;
}): Promise<void> {
	if (!task.assigneeId || !task.dueDate) return;

	const assignee = await getUserById(task.assigneeId);
	if (!assignee) {
		console.warn(
			`[taskAssignmentSideEffects] Assignee ${task.assigneeId} not found`,
		);
		return;
	}

	const dueDate = toDateOnly(task.dueDate);
	const participantParts = [
		assignee.$id,
		assignee.accountId,
		assignee.email,
		assignee.fullName,
	].filter((v): v is string => typeof v === "string" && v.length > 0);

	let eventId: string | undefined;

	try {
		const event = await createCalendarEvent({
			title: `Task: ${task.title}`,
			startDate: dueDate,
			endDate: dueDate,
			type: "deadline",
			description: [
				task.description?.trim() || "",
				`Assigned task due ${dueDate}.`,
				`Open tasks: /team/tasks`,
			]
				.filter(Boolean)
				.join("\n"),
			startTime: "",
			endTime: "",
			participants: participantParts.join(", "),
			createdBy: createdByAccountId || createdByUserId,
			createdByUserId,
			createdByAccountId: createdByAccountId || undefined,
			contractName: "",
			sensitivityLevel: "standard",
			requiresApproval: false,
			approvalStatus: "not_required",
		});
		eventId = event.$id;

		if (eventId) {
			await TaskService.updateTask(task.orgId, task.$id, {
				linkedEntityType: "calendar_event",
				linkedEntityId: eventId,
			});
		}

		const [year, month] = dueDate.split("-").map(Number);
		await CacheManager.invalidateCalendar(year, month).catch(() => undefined);
	} catch (error) {
		console.error(
			"[taskAssignmentSideEffects] Failed to create calendar event:",
			error,
		);
	}

	try {
		await triggerTaskAssignedNotification({
			userId: task.assigneeId,
			taskTitle: task.title,
			dueDate,
			assignedBy: assignerName,
			taskId: task.$id,
			eventId,
		});
	} catch (error) {
		console.error(
			"[taskAssignmentSideEffects] Failed to notify assignee:",
			error,
		);
	}
}
