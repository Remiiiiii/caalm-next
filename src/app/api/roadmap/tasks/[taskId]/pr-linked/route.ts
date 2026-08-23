import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { linkPullRequest, RoadmapError } from "@/lib/roadmap/service";

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
		const { taskId } = await context.params;
		const body = (await request.json()) as {
			prUrl?: string;
			prNumber?: number;
		};
		if (!body.prUrl || !body.prNumber) {
			return NextResponse.json(
				{ error: "prUrl and prNumber are required" },
				{ status: 400 },
			);
		}
		const task = await linkPullRequest({
			taskId,
			prUrl: body.prUrl,
			prNumber: body.prNumber,
			actor: user?.$id || "system:pr-link",
		});
		return NextResponse.json({ task });
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/tasks/pr-linked:", error);
		return NextResponse.json({ error: "Failed to link PR" }, { status: 500 });
	}
}
