import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/licenses/utils/response.util";
import { fetchLicenseMetricsRows } from "@/lib/licenses/fetchLicenseMetricsRows";
import { computeLicenseMetrics } from "@/lib/licenses/licensesListUtils";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse("User not found", 401, { requestId });
		}

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.VIEW,
		});
		if (permissionCheck) return permissionCheck;

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return errorResponse("Organization not found", 404, { requestId });
		}

		const payload = await CacheManager.withCache(
			"licenses/metrics",
			`${CACHE_KEYS.licenses.all()}:metrics:${defaultOrg.orgId}`,
			async () => {
				const rows = await fetchLicenseMetricsRows(defaultOrg.orgId);
				const uniqueDepartments = Array.from(
					new Set(
						rows
							.map((l) => l.division || l.department)
							.filter((d): d is string => !!d),
					),
				).sort();
				const uniqueAssignedManagers = Array.from(
					new Set(
						rows
							.flatMap((l) => l.assignedManagers || [])
							.filter((m): m is string => !!m),
					),
				).sort();

				return {
					metrics: computeLicenseMetrics(rows),
					metricsLicenses: rows,
					filterOptions: {
						departments: uniqueDepartments,
						assignedManagers: uniqueAssignedManagers,
					},
					total: rows.length,
				};
			},
			CACHE_TTLS.long,
		);

		return successResponse(payload, { requestId });
	} catch (error) {
		console.error("Licenses metrics API error:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch license metrics"),
			500,
			{ requestId },
		);
	}
}
