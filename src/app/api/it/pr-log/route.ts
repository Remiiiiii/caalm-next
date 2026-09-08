import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getPrLogOverview, PrLogError } from "@/lib/it/pr-log/service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.VIEW_ROADMAP,
	});
	if (denied) return denied;

	try {
		const overview = await getPrLogOverview();
		return NextResponse.json(overview);
	} catch (error) {
		if (error instanceof PrLogError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("[SERVER] it/pr-log:", error);
		return NextResponse.json(
			{ error: "Failed to load PR log" },
			{ status: 500 },
		);
	}
}
