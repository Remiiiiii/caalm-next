import { type NextRequest, NextResponse } from "next/server";
import { getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { resolveStorageLimitForUser } from "@/lib/storage/resolveStorageLimit";

export async function GET(_request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const cacheKey = CACHE_KEYS.storage.usage(user.$id);

		const totalSpace = await CacheManager.withCache(
			"storage/usage",
			cacheKey,
			async () => await getTotalSpaceUsed(),
		);

		const { limitBytes, limitGB } = await resolveStorageLimitForUser(user.$id);

		return NextResponse.json({
			...totalSpace,
			limitBytes,
			limitGB,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("Failed to fetch storage usage:", error);
		return NextResponse.json(
			{ error: "Failed to fetch storage usage", message },
			{ status: 500 },
		);
	}
}
