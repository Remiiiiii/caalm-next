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
import { CACHE_KEYS } from "@/lib/services/cache-keys";
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
		const reportType = searchParams.get("type") || "summary";
		const validReportTypes = new Set([
			"summary",
			"utilization",
			"cost",
			"expiration",
		]);
		if (!validReportTypes.has(reportType)) {
			return errorResponse("Invalid report type", 400, { requestId });
		}
		const cacheKey = CACHE_KEYS.licenses.reports(
			defaultOrg.orgId,
			reportType,
		);

		const reportData = await CacheManager.withCache(
			"licenses/reports",
			cacheKey,
			async () => {
				const allLicenses = await LicenseService.listLicenses(defaultOrg.orgId);
				let data: Record<string, unknown> = {};

				switch (reportType) {
			case "summary": {
				const totalLicenses = allLicenses.licenses.length;
				const activeLicenses = allLicenses.licenses.filter(
					(l: any) => l.status === "active",
				).length;
				const expiredLicenses = allLicenses.licenses.filter(
					(l: any) => l.status === "expired",
				).length;

				const totalCost = allLicenses.licenses.reduce(
					(sum: number, l: any) => sum + (l.cost || 0),
					0,
				);

				data = {
					totalLicenses,
					activeLicenses,
					expiredLicenses,
					totalCost,
				};
				break;
			}

			case "utilization": {
				const utilizationData = allLicenses.licenses.map((l: any) => ({
					licenseId: l.$id,
					licenseName: l.licenseName,
					quantity: l.quantity || 0,
					availableQuantity: l.availableQuantity || 0,
					utilizationRate:
						l.quantity && l.quantity > 0
							? ((l.quantity - (l.availableQuantity || 0)) / l.quantity) * 100
							: 0,
				}));

				data = { utilization: utilizationData };
				break;
			}

			case "cost": {
				const costByVendor: Record<string, number> = {};
				const costByType: Record<string, number> = {};
				const costByDepartment: Record<string, number> = {};

				allLicenses.licenses.forEach((l: any) => {
					const cost = l.cost || 0;
					if (l.vendor) {
						costByVendor[l.vendor] = (costByVendor[l.vendor] || 0) + cost;
					}
					if (l.licenseType) {
						costByType[l.licenseType] = (costByType[l.licenseType] || 0) + cost;
					}
					if (l.department) {
						costByDepartment[l.department] =
							(costByDepartment[l.department] || 0) + cost;
					}
				});

				data = {
					costByVendor,
					costByType,
					costByDepartment,
				};
				break;
			}

			case "expiration": {
				const expirationData = allLicenses.licenses
					.filter((l: any) => l.expirationDate)
					.map((l: any) => ({
						licenseId: l.$id,
						licenseName: l.licenseName,
						expirationDate: l.expirationDate,
						daysUntilExpiry: l.daysUntilExpiry,
						status: l.status,
					}))
					.sort((a: any, b: any) => {
						if (!a.expirationDate) return 1;
						if (!b.expirationDate) return -1;
						return a.expirationDate.localeCompare(b.expirationDate);
					});

				data = { expiration: expirationData };
				break;
			}

			default:
				throw new Error("Invalid report type");
				}

				return data;
			},
		);

		return successResponse(reportData, { requestId });
	} catch (error) {
		console.error("Generate license report error:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to generate report"),
			500,
			{ requestId },
		);
	}
}
