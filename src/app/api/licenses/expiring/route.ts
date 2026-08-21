import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/licenses/utils/response.util";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.VIEW,
		});
		if (permissionCheck) return permissionCheck;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse("User not found", 401, { requestId });
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return errorResponse("Organization not found", 404, { requestId });
		}

		const { searchParams } = new URL(request.url);
		const days = parseInt(searchParams.get("days") || "30", 10);

		const expiringLicenses = await CacheManager.withCache(
			"licenses/expiring",
			`${CACHE_KEYS.licenses.expiring(days)}:${defaultOrg.orgId}`,
			async () => LicenseService.getExpiringLicenses(defaultOrg.orgId, days),
			CACHE_TTLS.long,
		);

		return successResponse(
			{ licenses: expiringLicenses, count: expiringLicenses.length },
			{ requestId },
		);
	} catch (error) {
		console.error("Get expiring licenses error:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to fetch expiring licenses"),
			500,
			{ requestId },
		);
	}
}
