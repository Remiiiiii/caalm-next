import { type NextRequest, NextResponse } from "next/server";
import type { AuditModule } from "@/lib/audits/audit-log.utils";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { getAuditLogsPage } from "@/lib/services/audit-logger";

function parseFilters(request: NextRequest, orgId: string) {
	const { searchParams } = new URL(request.url);
	const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
	const limit = Math.min(
		100,
		Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
	);
	const offset = (page - 1) * limit;

	const moduleParam = searchParams.get("module");
	const module =
		moduleParam && moduleParam !== "all"
			? (moduleParam as AuditModule)
			: undefined;

	return {
		page,
		limit,
		offset,
		filters: {
			orgId,
			startDate: searchParams.get("startDate") || undefined,
			endDate: searchParams.get("endDate") || undefined,
			userId: searchParams.get("userId") || undefined,
			action: searchParams.get("action") || undefined,
			status: searchParams.get("status") || undefined,
			search: searchParams.get("search") || undefined,
			module,
			limit,
			offset,
		},
	};
}

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.AUDIT.VIEW,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId || "default_organization";
		const { page, limit, offset, filters } = parseFilters(request, orgId);

		const cacheKey = CACHE_KEYS.audits.logs(
			JSON.stringify({ orgId, ...filters, page }),
		);

		const pageResult = await CacheManager.withCache(
			"audits/logs",
			cacheKey,
			async () => getAuditLogsPage(filters),
		);

		const totalPages = Math.max(1, Math.ceil(pageResult.total / limit));

		return NextResponse.json({
			success: true,
			logs: pageResult.logs,
			total: pageResult.total,
			page,
			limit,
			offset,
			totalPages,
		});
	} catch (error) {
		console.error("[SERVER] Error fetching audit logs via API:", error);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error ? error.message : "Failed to fetch audit logs",
			},
			{ status: 500 },
		);
	}
}
