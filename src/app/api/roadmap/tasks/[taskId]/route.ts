import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	getTaskDetail,
	resolveTaskPullRequest,
	RoadmapError,
} from "@/lib/roadmap/service";
import { getSectionById } from "@/lib/roadmap/store";

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
		const section = await getSectionById(detail.task.sectionId);
		const resolvedPr = section
			? await resolveTaskPullRequest(detail.task, section.sectionNumber)
			: null;

		const prStatus = resolvedPr
			? {
					state: resolvedPr.state,
					htmlUrl: resolvedPr.htmlUrl,
					title: resolvedPr.title,
					headRef: resolvedPr.headRef,
					number: resolvedPr.number,
					source: resolvedPr.source,
				}
			: null;

		return NextResponse.json({ ...detail, prStatus, resolvedPr });
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/tasks/[taskId]:", error);
		return NextResponse.json({ error: "Failed to load task" }, { status: 500 });
	}
}
