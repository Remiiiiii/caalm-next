import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { rejectForcedComplete, RoadmapError } from "@/lib/roadmap/service";

/**
 * Explicitly forbidden endpoint — checkboxes cannot force-complete.
 * Always returns 403 (after auth) and logs a security event.
 */
export async function POST(
	request: NextRequest,
	_context: { params: Promise<{ taskId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.IT.VIEW_ROADMAP,
			PERMISSIONS.IT.MANAGE_ROADMAP,
		],
	});
	if (denied) return denied;

	try {
		await rejectForcedComplete();
		return NextResponse.json({ error: "unreachable" }, { status: 500 });
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	return POST(request, context);
}
