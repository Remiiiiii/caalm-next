import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { computeRiskImpact } from "@/lib/dashboard/risk-impact.service";
import type { RiskImpactPeriod } from "@/lib/dashboard/risk-impact.types";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

const VALID_PERIODS = new Set<RiskImpactPeriod>(["ytd", "last30", "last90"]);

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.CONTRACTS.VIEW,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const periodParam = request.nextUrl.searchParams.get("period") || "ytd";
		const period = (
			VALID_PERIODS.has(periodParam as RiskImpactPeriod) ? periodParam : "ytd"
		) as RiskImpactPeriod;

		const division = request.nextUrl.searchParams.get("division") || undefined;

		let orgId = getOrgIdFromRequest(request);
		if (!orgId) {
			const defaultOrg = await getUserDefaultOrganization(user.$id);
			orgId = defaultOrg?.orgId || "default_organization";
		}

		const cacheKey = CACHE_KEYS.dashboard.riskImpact(
			orgId,
			user.$id,
			period,
			division,
		);

		const data = await CacheManager.withCache(
			"dashboard/risk-impact",
			cacheKey,
			() =>
				computeRiskImpact({
					userId: user.$id,
					orgId,
					period,
					division,
				}),
			CACHE_TTLS.medium,
		);

		return NextResponse.json({
			success: true,
			data,
			timestamp: Date.now(),
		});
	} catch (error) {
		console.error("Error fetching risk impact:", error);
		return NextResponse.json(
			{
				error: "Failed to load risk impact",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
