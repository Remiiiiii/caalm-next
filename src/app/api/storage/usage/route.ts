import { type NextRequest, NextResponse } from "next/server";
import { getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(_request: NextRequest) {
	try {
		// Cache key for storage usage
		const cacheKey = CACHE_KEYS.storage.usage();

		// Fetch storage usage with caching (5 minutes TTL)
		const totalSpace = await CacheManager.withCache(
			"storage/usage",
			cacheKey,
			async () => await getTotalSpaceUsed(),
		);

		return NextResponse.json(totalSpace);
	} catch (error: any) {
		console.error("Failed to fetch storage usage:", error);
		return NextResponse.json(
			{ error: "Failed to fetch storage usage", message: error.message },
			{ status: 500 },
		);
	}
}
