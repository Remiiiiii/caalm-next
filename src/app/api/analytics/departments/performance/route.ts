import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { computeDepartmentPerformance } from "@/lib/dashboard/department-performance";
import { requirePermission } from "@/lib/rbac/middleware";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

/** Live widget: keep cache short so metrics stay volatile. */
const LIVE_PERFORMANCE_TTL_SECONDS = 30;

function startOfUtcWeek(d: Date): number {
	const day = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
	const dow = day.getUTCDay(); // 0 = Sunday
	day.setUTCDate(day.getUTCDate() - dow);
	return day.getTime();
}

function countActivitiesByWeek(
	rows: Array<{ timestamp?: string; $createdAt?: string }>,
): { thisWeek: number; lastWeek: number } {
	const now = new Date();
	const thisWeekStart = startOfUtcWeek(now);
	const lastWeekStart = thisWeekStart - 7 * 86400000;
	let thisWeek = 0;
	let lastWeek = 0;

	for (const row of rows) {
		const ts = row.timestamp || row.$createdAt;
		if (!ts) continue;
		const t = new Date(ts).getTime();
		if (Number.isNaN(t)) continue;
		if (t >= thisWeekStart) thisWeek += 1;
		else if (t >= lastWeekStart && t < thisWeekStart) lastWeek += 1;
	}

	return { thisWeek, lastWeek };
}

async function buildOrgDepartmentPerformance() {
	const { tablesDB } = await createAdminClient();

	const [contracts, users, activities] = await Promise.all([
		tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			queries: [
				Query.limit(1000),
				Query.select(["department", "compliance"]),
			],
		}),
		tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.usersCollectionId,
			queries: [Query.limit(1000), Query.select(["status"])],
		}),
		tablesDB
			.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.recentActivityCollectionId,
				queries: [Query.limit(200), Query.orderDesc("$createdAt")],
			})
			.catch(() => ({ rows: [] as Array<{ timestamp?: string; $createdAt?: string }> })),
	]);

	const { thisWeek, lastWeek } = countActivitiesByWeek(
		activities.rows as Array<{ timestamp?: string; $createdAt?: string }>,
	);

	const metrics = computeDepartmentPerformance({
		contracts: contracts.rows as Array<Record<string, unknown>>,
		users: users.rows as Array<Record<string, unknown>>,
		activityThisWeek: thisWeek,
		activityLastWeek: lastWeek,
	});

	return {
		...metrics,
		available: true,
		generatedAt: new Date().toISOString(),
	};
}

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.SETTINGS.VIEW,
			PERMISSIONS.AUDIT.VIEW,
		],
	});
	if (denied) return denied;

	try {
		const data = await CacheManager.withCache(
			"analytics/departments-performance",
			CACHE_KEYS.analytics.departmentsPerformance(),
			buildOrgDepartmentPerformance,
			LIVE_PERFORMANCE_TTL_SECONDS,
		);

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error("analytics/departments/performance error", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to load department performance",
				data: {
					averageProductivity: 0,
					meetingTargetCount: 0,
					totalStaffCount: 0,
					trend: "stable" as const,
					totalContracts: 0,
					departmentsWithContracts: 0,
					available: false,
					generatedAt: new Date().toISOString(),
				},
			},
			{ status: 503 },
		);
	}
}
