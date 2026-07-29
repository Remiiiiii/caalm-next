import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { taskUpdateSchema } from "@/lib/api/tasks/schemas/task.schema";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

interface RouteContext {
	params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const permissionCheck = await requirePermission(request, {
			permission: [PERMISSIONS.EVENTS.CREATE, PERMISSIONS.EVENTS.INVITE],
		});
		if (permissionCheck) return permissionCheck;

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json({ error: "Organization not found" }, { status: 404 });
		}

		const { id } = await context.params;
		const task = await TaskService.getTask(defaultOrg.orgId, id);
		if (!task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true, data: { task } });
	} catch (error) {
		console.error("Task GET error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to fetch task" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const permissionCheck = await requirePermission(request, {
			permission: [PERMISSIONS.EVENTS.CREATE, PERMISSIONS.EVENTS.INVITE],
		});
		if (permissionCheck) return permissionCheck;

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json({ error: "Organization not found" }, { status: 404 });
		}

		const { id } = await context.params;
		const body = await request.json();
		const validated = taskUpdateSchema.parse(body);

		if (validated.assigneeId) {
			const assignCheck = await requirePermission(request, {
				permission: PERMISSIONS.EVENTS.INVITE,
			});
			if (assignCheck) return assignCheck;
		}

		const existing = await TaskService.getTask(defaultOrg.orgId, id);
		if (!existing) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		const previousStatus = existing.status;
		const task = await TaskService.updateTask(defaultOrg.orgId, id, validated);
		if (!task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		const statusChanged =
			validated.status !== undefined && validated.status !== previousStatus;
		const assignerId = task.createdById;
		const changedByName =
			(user as { fullName?: string }).fullName || user.email || "Someone";

		if (
			statusChanged &&
			assignerId &&
			assignerId !== user.$id
		) {
			const { triggerTaskStatusChangedNotification } = await import(
				"@/lib/utils/notificationTriggers"
			);
			await triggerTaskStatusChangedNotification({
				userId: assignerId,
				taskTitle: task.title,
				taskId: task.$id,
				previousStatus,
				newStatus: task.status,
				changedBy: changedByName,
			}).catch((error) => {
				console.error("Failed to notify assigner of status change:", error);
			});
		}

		await logAuditEvent({
			event_id: `task_update_${task.$id}`,
			event_title: `Task updated: ${task.title}`,
			action: "update",
			source: "caalm",
			user_id: user.$id,
			user_name: changedByName,
			user_email: user.email || "",
			status: "success",
			orgId: defaultOrg.orgId,
			module: "system",
			target_type: "task",
			target_id: task.$id,
			target_label: task.title,
			summary: `${changedByName} updated task ${task.title}`,
			metadata: {
				status: task.status,
				previousStatus: statusChanged ? previousStatus : undefined,
				priority: task.priority,
			},
		}).catch(() => undefined);

		return NextResponse.json({ success: true, data: { task } });
	} catch (error) {
		console.error("Task PUT error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to update task",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.EVENTS.CREATE,
		});
		if (permissionCheck) return permissionCheck;

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json({ error: "Organization not found" }, { status: 404 });
		}

		const { id } = await context.params;
		const deleted = await TaskService.deleteTask(defaultOrg.orgId, id);
		if (!deleted) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		await logAuditEvent({
			event_id: `task_delete_${id}`,
			event_title: `Task deleted: ${id}`,
			action: "delete",
			source: "caalm",
			user_id: user.$id,
			user_name:
				(user as { fullName?: string }).fullName || user.email || "unknown",
			user_email: user.email || "",
			status: "success",
			orgId: defaultOrg.orgId,
			module: "system",
			target_type: "task",
			target_id: id,
			summary: `${(user as { fullName?: string }).fullName || user.email} deleted task ${id}`,
		}).catch(() => undefined);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Task DELETE error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to delete task",
			},
			{ status: 500 },
		);
	}
}
