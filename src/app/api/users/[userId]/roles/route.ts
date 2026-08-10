import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getUserRoles } from "@/lib/rbac/permissions";
import { getRole } from "@/lib/rbac/roles";
import { CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

/**
 * Get user's roles with role names
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.VIEW,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const { userId } = await params;
		const orgId =
			(await getOrgIdFromRequest(request)) || "default_organization";

		// Check cache first for faster response
		const cacheKey = `user:roles:${userId}:${orgId}`;
		const cachedData = await CacheManager.withCache(
			"rbac/userRoles",
			cacheKey,
			async () => {
				// Get user's roles from database
				const userRoles = await getUserRoles(userId, orgId);

				// Fetch role details for each role in parallel
				const rolesWithDetails = await Promise.all(
					userRoles.map(async (ur) => {
						try {
							const role = await getRole(ur.roleId);
							return role;
						} catch {
							return null;
						}
					}),
				);

				return {
					success: true,
					data: {
						roles: rolesWithDetails.filter(Boolean),
						assignments: userRoles,
					},
					timestamp: Date.now(),
				};
			},
			CACHE_TTLS.veryLong, // 15 minutes - roles rarely change
		);

		return NextResponse.json(cachedData, {
			headers: {
				"Cache-Control": "private, max-age=900",
			},
		});
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error fetching user roles:", error);
		}
		return NextResponse.json(
			{ success: false, error: "Failed to fetch user roles" },
			{ status: 500 },
		);
	}
}
