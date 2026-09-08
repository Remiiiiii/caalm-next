import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { RoadmapError } from "@/lib/roadmap/service";
import { getTaskById, listStatusLogs } from "@/lib/roadmap/store";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.IT.VIEW_ROADMAP, PERMISSIONS.IT.MANAGE_ROADMAP],
	});
	if (denied) return denied;

	try {
		const { taskId } = await context.params;
		const task = await getTaskById(taskId);
		if (!task) throw new RoadmapError("Task not found", 404);
		const history = await listStatusLogs(taskId);
		return NextResponse.json({ taskId, history });
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("[SERVER] roadmap/tasks/history:", error);
		return NextResponse.json(
			{ error: "Failed to load history" },
			{ status: 500 },
		);
	}
}
