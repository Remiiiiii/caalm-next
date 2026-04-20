import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserPermissions } from "@/lib/rbac/permissions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { parseStringify } from "@/lib/utils";
import { deduplicateRequest } from "@/lib/utils/request-deduplication";

export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(request.url);
		const orgId = searchParams.get("orgId") || undefined;

		// Cache key for permissions check
		const cacheKey = CACHE_KEYS.rbac.check(user.$id, orgId);

		// Fetch permissions with caching (15 minutes TTL) + request deduplication
		const permissions = await deduplicateRequest(cacheKey, async () => {
			return CacheManager.withCache("rbac/check", cacheKey, async () =>
				getUserPermissions(user.$id, orgId),
			);
		});

		return NextResponse.json({
			success: true,
			permissions: parseStringify(permissions),
		});
	} catch (error) {
		console.error("Error fetching user permissions:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch permissions" },
			{ status: 500 },
		);
	}
}
