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
		const cacheKey = CACHE_KEYS.analytics.compliance(dbDept);

		const data = await CacheManager.withCache(
			"analytics/compliance",
			cacheKey,
			async () => {
				const { tablesDB } = await createAdminClient();

				const docs = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.contractsCollectionId,
					queries: [Query.equal("department", dbDept), Query.limit(200)],
				});

				const buckets: Record<string, number> = {
					"up-to-date": 0,
					"action-required": 0,
					"non-compliant": 0,
					unknown: 0,
				};

				for (const d of docs.rows as { compliance?: string }[]) {
					const key = d.compliance ?? "unknown";
					if (buckets[key] === undefined) buckets.unknown += 1;
					else buckets[key] += 1;
				}

				return Object.entries(buckets).map(([status, count]) => ({
					status,
					count,
				}));
			},
		);

		return Response.json({ data });
	} catch (error: any) {
		console.error("analytics/compliance error", error);
		return new Response(
			JSON.stringify({ error: error?.message || "Failed to load compliance" }),
			{ status: 500, headers: { "content-type": "application/json" } },
		);
	}
}
