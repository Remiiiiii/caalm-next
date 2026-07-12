import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { resolveDashboardHomePath } from "@/lib/rbac/dashboard-access-policy";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";

/**
 * Resolve the default dashboard path for the signed-in user (permission + role policy).
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const current = await getCurrentUser();
		const { userId } = await params;

		if (!current || current.$id !== userId) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const orgId =
			(await getOrgIdFromRequest(request)) || "default_organization";

		const path = await resolveDashboardHomePath(userId, orgId);

		return NextResponse.json({
			success: true,
			data: { path: path ?? "/dashboard" },
		});
	} catch (error) {
		console.error("[dashboard-home] Error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to resolve dashboard home" },
			{ status: 500 },
		);
	}
}
