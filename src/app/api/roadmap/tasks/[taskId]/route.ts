import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getTaskDetail, RoadmapError } from "@/lib/roadmap/service";
import { fetchPullRequestStatus } from "@/lib/roadmap/github";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.IT.VIEW_ROADMAP,
			PERMISSIONS.IT.MANAGE_ROADMAP,
		],
	});
	if (denied) return denied;

	try {
		const { taskId } = await context.params;
		const detail = await getTaskDetail(taskId);
		let prStatus: Awaited<ReturnType<typeof fetchPullRequestStatus>> | null =
			null;
		if (detail.task.prNumber) {
			prStatus = await fetchPullRequestStatus({
				prNumber: detail.task.prNumber,
			});
		}
		return NextResponse.json({ ...detail, prStatus });
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/tasks/[taskId]:", error);
		return NextResponse.json({ error: "Failed to load task" }, { status: 500 });
	}
}
