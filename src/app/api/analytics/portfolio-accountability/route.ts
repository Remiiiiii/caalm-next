import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { computePortfolioAccountability } from "@/lib/analytics/PortfolioAccountabilityAnalyticsService";
import type { PortfolioPeriod } from "@/lib/analytics/portfolioAccountability.types";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

const PERIODS = new Set<PortfolioPeriod>(["30d", "90d", "1y"]);

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.LICENSES.VIEW],
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	const rawPeriod = request.nextUrl.searchParams.get("period") || "30d";
	const period = PERIODS.has(rawPeriod as PortfolioPeriod)
		? (rawPeriod as PortfolioPeriod)
		: "30d";

	const resolvedOrgId = orgId || "default_organization";
	const cacheKey = CACHE_KEYS.analyticsPortfolio.accountability(
		resolvedOrgId,
		period,
	);

	const metrics = await CacheManager.withCache(
		"analytics/portfolio-accountability",
		cacheKey,
		async () =>
			computePortfolioAccountability(orgId || undefined, period),
	);

	return NextResponse.json({ success: true, metrics });
}
