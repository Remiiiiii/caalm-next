import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOverview, RoadmapError } from "@/lib/roadmap/service";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.IT.VIEW_ROADMAP,
			PERMISSIONS.IT.MANAGE_ROADMAP,
		],
	});
	if (denied) return denied;

	try {
		const skipCache = request.nextUrl.searchParams.get("fresh") === "1";
		const overview = await getOverview({ skipCache });
		return NextResponse.json(overview);
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/overview:", error);
		return NextResponse.json({ error: "Failed to load roadmap" }, { status: 500 });
	}
}
