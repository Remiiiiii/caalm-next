import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getUninvitedUsers } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.INVITE,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const refresh = request.nextUrl.searchParams.get("refresh") === "1";
		if (refresh) {
			await CacheManager.invalidateUsers();
		}

		const cacheKey = CACHE_KEYS.users.uninvited();
		const uninvitedUsers = await CacheManager.withCache(
			"users/uninvited",
			cacheKey,
			async () => await getUninvitedUsers(),
		);

		return NextResponse.json({
			data: uninvitedUsers,
			success: true,
		});
	} catch (error) {
		console.error("Failed to fetch uninvited users:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch uninvited users",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
