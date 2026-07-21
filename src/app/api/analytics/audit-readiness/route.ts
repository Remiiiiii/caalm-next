import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	buildAuditReadinessSummary,
	mapDepartmentsFromUnified,
} from "@/lib/analytics/audit-readiness.service";
import type { AuditPeriod } from "@/lib/audits/types";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

const VALID_PERIODS: AuditPeriod[] = ["7d", "30d", "90d", "ytd"];

export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const permissions = await getUserPermissions(user.$id, defaultOrg?.orgId);

		const hasAnalyticsAccess =
			permissions.includes(PERMISSIONS.CONTRACTS.VIEW) ||
			permissions.includes(PERMISSIONS.SETTINGS.VIEW) ||
			permissions.includes(PERMISSIONS.CALENDAR.VIEW_ALL) ||
			permissions.includes(PERMISSIONS.CALENDAR.VIEW_TEAM);

		if (!hasAnalyticsAccess) {
			return NextResponse.json(
				{ success: false, message: "Forbidden" },
				{ status: 403 },
			);
		}

		const { searchParams } = new URL(request.url);
		const periodParam = searchParams.get("period") as AuditPeriod | null;
		const period =
			periodParam && VALID_PERIODS.includes(periodParam) ? periodParam : "30d";

		const calendarParam = searchParams.get("calendarComplianceRate");
		const calendarAtRisk = searchParams.get("calendarAtRisk");
		const calendarOverdue = searchParams.get("calendarOverdue");

		const calendar =
			calendarParam !== null
				? {
						complianceRate: Number.parseInt(calendarParam, 10) || null,
						atRisk: Number.parseInt(calendarAtRisk ?? "0", 10) || 0,
						overdue: Number.parseInt(calendarOverdue ?? "0", 10) || 0,
					}
				: null;

		let unifiedTotals:
			| {
					totalContracts: number;
					totalBudget: number;
					overallComplianceRate: number;
			  }
			| undefined;
		let departments: ReturnType<typeof mapDepartmentsFromUnified> = [];

		if (permissions.includes(PERMISSIONS.CONTRACTS.VIEW)) {
			try {
				const unifiedResponse = await fetch(
					`${request.nextUrl.origin}/api/analytics/unified?userId=${user.$id}`,
					{
						headers: { cookie: request.headers.get("cookie") ?? "" },
					},
				);
				if (unifiedResponse.ok) {
					const unifiedJson = await unifiedResponse.json();
					const data = unifiedJson.data ?? unifiedJson;
					unifiedTotals = data.totals;
					departments = mapDepartmentsFromUnified(data.departments ?? []);
				}
			} catch {
				// Unified data optional — compliance snapshot still provides core metrics
			}
		}

		const cacheKey = CACHE_KEYS.analytics.auditReadiness(user.$id, period);

		const summary = await CacheManager.withCache(
			"analytics/audit-readiness",
			cacheKey,
			async () =>
				buildAuditReadinessSummary(
					user.$id,
					period,
					departments,
					unifiedTotals,
					calendar,
				),
			CACHE_TTLS.medium,
		);

		return NextResponse.json({ success: true, data: summary });
	} catch (error) {
		console.error("Error fetching audit readiness:", error);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to fetch audit readiness",
			},
			{ status: 500 },
		);
	}
}
