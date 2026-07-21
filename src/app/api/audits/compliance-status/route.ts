import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getComplianceStatusForRequest } from "@/lib/audits/compliance-status.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.AUDIT.VIEW,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const cacheKey = CACHE_KEYS.audits.complianceStatus(user.$id);

		const data = await CacheManager.withCache(
			"audits/compliance-status",
			cacheKey,
			async () => await getComplianceStatusForRequest(),
			CACHE_TTLS.medium,
		);

		if (!data) {
			return NextResponse.json(
				{ success: false, message: "Unable to load compliance status" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error("Error fetching compliance status:", error);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to fetch compliance status",
			},
			{ status: 500 },
		);
	}
}
