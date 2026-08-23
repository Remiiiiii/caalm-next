import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getSectionTaskTree, RoadmapError } from "@/lib/roadmap/service";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ sectionId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.IT.VIEW_ROADMAP,
			PERMISSIONS.IT.MANAGE_ROADMAP,
		],
	});
	if (denied) return denied;

	try {
		const { sectionId } = await context.params;
		const data = await getSectionTaskTree(sectionId);
		return NextResponse.json(data);
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/sections/tasks:", error);
		return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
	}
}
