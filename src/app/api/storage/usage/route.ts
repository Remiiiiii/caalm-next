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
		const { limitBytes, limitGB } = await resolveStorageLimitForUser(user.$id);

		try {
			const totalSpace = await CacheManager.withCache(
				"storage/usage",
				cacheKey,
				async () => await getTotalSpaceUsed(),
			);

			return NextResponse.json({
				...totalSpace,
				limitBytes,
				limitGB,
			});
		} catch (usageError: unknown) {
			// Sidebar bar is best-effort — don't 500 the whole app chrome
			const message =
				usageError instanceof Error ? usageError.message : "Unknown error";
			console.error("[SERVER] /api/storage/usage: getTotalSpaceUsed failed:", message);
			return NextResponse.json({
				image: { size: 0, latestDate: "" },
				document: { size: 0, latestDate: "" },
				video: { size: 0, latestDate: "" },
				audio: { size: 0, latestDate: "" },
				other: { size: 0, latestDate: "" },
				used: 0,
				all: limitBytes,
				limitBytes,
				limitGB,
			});
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[SERVER] Failed to fetch storage usage:", error);
		return NextResponse.json(
			{ error: "Failed to fetch storage usage", message },
			{ status: 500 },
		);
	}
}
