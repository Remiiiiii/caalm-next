import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { taskBulkSchema } from "@/lib/api/tasks/schemas/task.schema";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import CacheManager from "@/lib/services/cache-manager";

export async function POST(request: NextRequest) {
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

		const body = await request.json();
		const validated = taskBulkSchema.parse(body);

		if (validated.action === "assign") {
			const assignDenied = await requirePermission(request, {
				permission: PERMISSIONS.EVENTS.INVITE,
			});
			if (assignDenied) return assignDenied;
		}

		const updated: string[] = [];
		const failed: Array<{ id: string; error: string }> = [];

		for (const id of validated.ids) {
			try {
				if (validated.action === "assign") {
					const task = await TaskService.updateTask(defaultOrg.orgId, id, {
						assigneeId: validated.assigneeId ?? null,
					});
					if (!task) {
						failed.push({ id, error: "Not found" });
						continue;
					}
					updated.push(id);
				} else if (validated.action === "status") {
					if (!validated.status) {
						failed.push({ id, error: "Missing status" });
						continue;
					}
					const task = await TaskService.updateTask(defaultOrg.orgId, id, {
						status: validated.status,
					});
					if (!task) {
						failed.push({ id, error: "Not found" });
						continue;
					}
					updated.push(id);
				} else if (validated.action === "priority") {
					if (!validated.priority) {
						failed.push({ id, error: "Missing priority" });
						continue;
					}
					const task = await TaskService.updateTask(defaultOrg.orgId, id, {
						priority: validated.priority,
					});
					if (!task) {
						failed.push({ id, error: "Not found" });
						continue;
					}
					updated.push(id);
				} else if (validated.action === "delete") {
					const task = await TaskService.deleteTask(defaultOrg.orgId, id);
					if (!task) {
						failed.push({ id, error: "Not found" });
						continue;
					}
					updated.push(id);
				} else {
					const _exhaustive: never = validated.action;
					failed.push({ id, error: `Unknown action: ${_exhaustive}` });
				}
			} catch (error) {
				failed.push({
					id,
					error: error instanceof Error ? error.message : "Failed",
				});
			}
		}

		const actorName =
			(user as { fullName?: string }).fullName || user.email || "unknown";
		await logAuditEvent({
			event_id: `task_bulk_${validated.action}_${Date.now()}`,
			event_title: `Bulk ${validated.action} on ${updated.length} tasks`,
			action: validated.action === "delete" ? "delete" : "update",
			source: "caalm",
			user_id: user.$id,
			user_name: actorName,
			user_email: user.email || "",
			status: "success",
			orgId: defaultOrg.orgId,
			module: "system",
			target_type: "task",
			target_id: updated[0] || "",
			summary: `${actorName} bulk-${validated.action} ${updated.length} tasks`,
			metadata: { action: validated.action, updated, failed },
		}).catch(() => undefined);

		await CacheManager.invalidateTasks(defaultOrg.orgId).catch(() => undefined);

		return NextResponse.json({
			success: true,
			data: { updated, failed },
		});
	} catch (error) {
		console.error("[SERVER] tasks/bulk POST:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to update tasks",
			},
			{ status: 500 },
		);
	}
}
