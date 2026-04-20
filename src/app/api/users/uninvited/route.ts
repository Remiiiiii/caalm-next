import { type NextRequest, NextResponse } from "next/server";
import { getUninvitedUsers } from "@/lib/actions/user.actions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(_request: NextRequest) {
	try {
		// Cache key for uninvited users
		const cacheKey = CACHE_KEYS.users.uninvited();

		// Fetch uninvited users with caching (15 minutes TTL)
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
