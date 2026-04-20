import { type NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/rbac/roles";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

/**
 * Get role display name for a user
 * Accepts roleId parameter
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const { userId } = await params;
		const { searchParams } = new URL(request.url);
		const roleId = searchParams.get("roleId");

		if (!roleId) {
			return NextResponse.json(
				{ success: false, error: "roleId parameter required" },
				{ status: 400 },
			);
		}

		// Cache key for role name (using roleId as identifier)
		const cacheKey = CACHE_KEYS.users.roleNameByUserId(userId, roleId);

		// Fetch role name with caching (15 minutes TTL)
		const result = await CacheManager.withCache(
			"users/role-name",
			cacheKey,
			async () => {
				// Fetch role name from database
				const role = await getRole(roleId);
				if (role) {
					return {
						success: true,
						roleName: role.name,
					};
				}
				return {
					success: false,
					error: "Role not found",
				};
			},
		);

		return NextResponse.json(result, {
			status: result.success ? 200 : 404,
		});
	} catch (error) {
		console.error("Error fetching role name:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch role name" },
			{ status: 500 },
		);
	}
}
