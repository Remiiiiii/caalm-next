import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import CacheManager from "@/lib/services/cache-manager";

interface RouteContext {
	params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.EVENTS.CREATE,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		const { id } = await context.params;
		const task = await TaskService.restoreTask(defaultOrg.orgId, id);
		if (!task) {
			return NextResponse.json(
				{ error: "Task not found or not deleted" },
				{ status: 404 },
			);
		}

		const actorName =
			(user as { fullName?: string }).fullName || user.email || "unknown";
		await logAuditEvent({
			event_id: `task_restore_${id}`,
			event_title: `Task restored: ${task.title}`,
			action: "update",
			source: "caalm",
			user_id: user.$id,
			user_name: actorName,
			user_email: user.email || "",
			status: "success",
			orgId: defaultOrg.orgId,
			module: "system",
			target_type: "task",
			target_id: id,
			target_label: task.title,
			summary: `${actorName} restored task ${task.title}`,
		}).catch(() => undefined);

		await CacheManager.invalidateTasks(defaultOrg.orgId).catch(() => undefined);

		return NextResponse.json({ success: true, data: { task } });
	} catch (error) {
		console.error("[SERVER] tasks/[id]/restore POST:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to restore task",
			},
			{ status: 500 },
		);
	}
}
