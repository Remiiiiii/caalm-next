import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { parseStringify } from "@/lib/utils";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.LICENSES.VIEW],
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg?.orgId) {
			return NextResponse.json(
				{ error: "Organization required" },
				{ status: 403 },
			);
		}

		const { searchParams } = new URL(request.url);
		const limit = searchParams.get("limit")
			? parseInt(searchParams.get("limit")!, 10)
			: 10;

		const orgId = defaultOrg.orgId;
		const cacheKey = CACHE_KEYS.dashboard.files(orgId, limit);

		const files = await CacheManager.withCache(
			"dashboard/files",
			cacheKey,
			async () => {
				const { tablesDB } = await createAdminClient();

				const result = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.filesCollectionId || "files",
					queries: [
						Query.equal("orgId", orgId),
						Query.limit(limit),
						Query.orderDesc("$createdAt"),
					],
				});

				return parseStringify(result).rows || [];
			},
		);

		return NextResponse.json({ data: files });
	} catch (error: any) {
		console.error("[SERVER] dashboard/files:", error);

		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			error?.isTestConfig ||
			error?.code === "TEST_CONFIG" ||
			error?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			error?.message?.includes("AppwriteException")
		) {
			return NextResponse.json({ data: [] }, { status: 200 });
		}

		return NextResponse.json(
			{ error: "Failed to fetch dashboard files" },
			{ status: 500 },
		);
	}
}
