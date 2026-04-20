import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getAuditStats } from "@/lib/services/audit-logger";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	try {
		// Check permission
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.AUDIT.VIEW,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		// Cache key for audit stats
		const cacheKey = CACHE_KEYS.audits.stats();

		// Fetch audit stats with caching (10 minutes TTL)
		const stats = await CacheManager.withCache(
			"audits/stats",
			cacheKey,
			async () => await getAuditStats(),
		);

		return NextResponse.json({
			success: true,
			stats,
		});
	} catch (error) {
		console.error("Error fetching audit stats via API:", error);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to fetch audit stats",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
