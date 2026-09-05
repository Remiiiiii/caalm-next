import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { computePortfolioAccountability } from "@/lib/analytics/PortfolioAccountabilityAnalyticsService";
import type { PortfolioPeriod } from "@/lib/analytics/portfolioAccountability.types";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

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

	const metrics = await computePortfolioAccountability(
		orgId || undefined,
		period,
	);
	return NextResponse.json({ success: true, metrics });
}
