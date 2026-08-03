import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	taskCreateSchema,
	taskListQuerySchema,
} from "@/lib/api/tasks/schemas/task.schema";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const permissionCheck = await requirePermission(request, {
			permission: [PERMISSIONS.EVENTS.CREATE, PERMISSIONS.EVENTS.INVITE],
		});
		if (permissionCheck) return permissionCheck;

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		const { searchParams } = new URL(request.url);
		const q = (name: string) => searchParams.get(name) ?? undefined;
		const validated = taskListQuerySchema.parse({
			limit: q("limit"),
			offset: q("offset"),
			status: q("status"),
			assigneeId: q("assigneeId"),
			department: q("department"),
			priority: q("priority"),
			search: q("search"),
			dueBefore: q("dueBefore"),
			dueAfter: q("dueAfter"),
		});

		const result = await TaskService.listTasks(
			defaultOrg.orgId,
			{
				status: validated.status,
				assigneeId: validated.assigneeId,
				department: validated.department,
				priority: validated.priority,
				search: validated.search,
				dueBefore: validated.dueBefore,
				dueAfter: validated.dueAfter,
			},
			{ limit: validated.limit, offset: validated.offset },
		);

		return NextResponse.json({
			success: true,
			data: { tasks: result.tasks },
			meta: {
				total: result.total,
				limit: validated.limit,
				offset: validated.offset,
			},
		});
	} catch (error) {
		console.error("Tasks GET error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to fetch tasks",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.EVENTS.CREATE,
		});
		if (permissionCheck) return permissionCheck;

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		const validated = taskCreateSchema.parse(body);

		if (validated.assigneeId) {
			const assignCheck = await requirePermission(request, {
				permission: PERMISSIONS.EVENTS.INVITE,
			});
			if (assignCheck) return assignCheck;
		}

		const task = await TaskService.createTask(
			defaultOrg.orgId,
			user.$id,
			validated,
		);

		if (task.assigneeId && task.dueDate) {
			const { applyTaskAssignmentSideEffects } = await import(
				"@/lib/api/tasks/services/taskAssignmentSideEffects"
			);
			await applyTaskAssignmentSideEffects({
				task,
				createdByUserId: user.$id,
				createdByAccountId:
					(user as { accountId?: string }).accountId || user.$id,
				assignerName:
					(user as { fullName?: string }).fullName || user.email || "Someone",
			}).catch((error) => {
				console.error("Task assignment side effects failed:", error);
			});
		}

		await logAuditEvent({
			event_id: `task_create_${task.$id}`,
			event_title: `Task created: ${task.title}`,
			action: "create",
			source: "caalm",
			user_id: user.$id,
			user_name:
				(user as { fullName?: string }).fullName || user.email || "unknown",
			user_email: user.email || "",
			status: "success",
			orgId: defaultOrg.orgId,
			module: "system",
			target_type: "task",
			target_id: task.$id,
			target_label: task.title,
			summary: `${(user as { fullName?: string }).fullName || user.email} created task ${task.title}`,
			metadata: { assigneeId: task.assigneeId },
		}).catch(() => undefined);

		return NextResponse.json(
			{ success: true, data: { task } },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Tasks POST error:", error);
		const message =
			error instanceof Error ? error.message : "Failed to create task";
		const status = message.includes("validation") ? 400 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}
