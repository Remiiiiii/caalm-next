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

		const cacheKey = CACHE_KEYS.rbac.check(user.$id, orgId);

		// Drop stale empty `rbac:check:*` entries. Do not block the permission
		// lookup if the cache is slow or unreachable.
		await Promise.race([
			CacheManager.invalidate(cacheKey).catch(() => undefined),
			new Promise((resolve) => setTimeout(resolve, 1500)),
		]);

		const permissions = await deduplicateRequest(cacheKey, async () =>
			getUserPermissions(user.$id, orgId),
		);

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
