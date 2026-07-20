import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getDepartmentDashboardData } from "@/lib/dashboard/department-dashboard.service";
import {
	getOrgIdFromRequest,
	requirePermission,
} from "@/lib/rbac/middleware";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: [
				PERMISSIONS.CALENDAR.VIEW_TEAM,
				PERMISSIONS.CONTRACTS.REVIEW,
				PERMISSIONS.CONTRACTS.APPROVE,
				PERMISSIONS.CONTRACTS.VIEW,
			],
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const division =
			request.nextUrl.searchParams.get("division") ||
			(user as { division?: string }).division ||
			"";

		if (!division) {
			return NextResponse.json(
				{
					error: "Division is required. Update your profile with a division.",
				},
				{ status: 400 },
			);
		}

		const orgId =
			getOrgIdFromRequest(request) || "default_organization";
		const cacheKey = CACHE_KEYS.dashboard.department(
			orgId,
			user.$id,
			division,
		);

		const data = await CacheManager.withCache(
			"dashboard/department",
			cacheKey,
			() => getDepartmentDashboardData(division),
		);

		return NextResponse.json({
			success: true,
			data,
			timestamp: Date.now(),
		});
	} catch (error) {
		console.error("Error fetching department dashboard:", error);
		return NextResponse.json(
			{
				error: "Failed to load department dashboard",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
