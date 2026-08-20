import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { RoadmapError, startTask } from "@/lib/roadmap/service";

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.MANAGE_ROADMAP,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}
		const { taskId } = await context.params;
		const body = (await request.json()) as { branchName?: string };
		const task = await startTask({
			taskId,
			branchName: body.branchName || "",
			actorUserId: user.$id,
		});
		return NextResponse.json({ task });
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/tasks/start:", error);
		return NextResponse.json({ error: "Failed to start task" }, { status: 500 });
	}
}
