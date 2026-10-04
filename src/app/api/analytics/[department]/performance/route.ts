import type { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

function mapRouteToDbDepartment(routeDept: string): string {
	const mapping: Record<string, string> = {
		"child-welfare": "child-welfare",
		"behavioral-health": "behavioral-health",
		cfs: "cfs",
		residential: "residential",
		clinic: "clinic",
		administration: "administration",
	};
	return mapping[routeDept] || routeDept;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ department: string }> },
) {
	try {
		const denied = await requirePermission(request, {
			permission: [
				PERMISSIONS.CONTRACTS.VIEW,
				PERMISSIONS.SETTINGS.VIEW,
				PERMISSIONS.AUDIT.VIEW,
			],
		});
		if (denied) return denied;

		const resolvedParams = await params;
		const dbDept = mapRouteToDbDepartment(resolvedParams.department);
		const cacheKey = CACHE_KEYS.analytics.performance(dbDept);

		const data = await CacheManager.withCache(
			"analytics/performance",
			cacheKey,
			async () => {
				const { tablesDB } = await createAdminClient();

				const activities = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.recentActivityCollectionId,
					queries: [Query.limit(200)],
				});

				const departmentActivities = activities.rows.filter(
					(activity: { department?: string; type?: string; contractName?: string }) =>
						activity.department === dbDept ||
						activity.department === resolvedParams.department ||
						(activity.type === "contract" && activity.contractName),
				);

				const byWeek: Record<string, number> = {};
				for (const a of departmentActivities) {
					const ts =
						(a as { timestamp?: string; $createdAt?: string }).timestamp ||
						(a as { $createdAt?: string }).$createdAt;
					const date = new Date(ts || Date.now());
					const year = date.getUTCFullYear();
					const week = Math.ceil(
						((date.getTime() - Date.UTC(year, 0, 1)) / 86400000 +
							new Date(Date.UTC(year, 0, 1)).getUTCDay() +
							1) /
							7,
					);
					const key = `${year}-W${week}`;
					byWeek[key] = (byWeek[key] || 0) + 1;
				}

				return Object.entries(byWeek)
					.sort(([a], [b]) => (a < b ? -1 : 1))
					.map(([week, count]) => ({ week, count }));
			},
		);

		return Response.json({ data });
	} catch (error: any) {
		console.error("analytics/performance error", error);
		return new Response(
			JSON.stringify({ error: error?.message || "Failed to load performance" }),
			{ status: 500, headers: { "content-type": "application/json" } },
		);
	}
}
