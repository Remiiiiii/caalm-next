import type { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	requireAuth,
	requireContractPermission,
} from "@/lib/api/contracts/middleware/auth.middleware";
import {
	buildPaginationMeta,
	parsePaginationParams,
} from "@/lib/api/contracts/utils/pagination.util";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/contracts/utils/response.util";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	buildContractQueries,
	getContractListScope,
} from "@/lib/rbac/data-scope";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const permError = await requireContractPermission(request, "read");
		if (permError) return permError;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse(new Error("Unauthorized"), 401, { requestId });
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return errorResponse(new Error("Organization required"), 403, {
				requestId,
			});
		}

		const scope = await getContractListScope(user.$id, defaultOrg.orgId);
		const scopeQueries = buildContractQueries(scope);

		const { limit, offset } = parsePaginationParams(request);

		const cacheKey =
			scope.mode === "all_org"
				? CACHE_KEYS.contracts.database(limit, offset)
				: `contracts:database:scoped:${user.$id}:${scope.mode}:${limit}:${offset}:${
						scope.mode === "department"
							? scope.department
							: scope.mode === "own"
								? scope.userId
								: ""
					}`;

		const contracts = await CacheManager.withCache(
			"contracts/database",
			cacheKey,
			async () => {
				const { tablesDB } = await createAdminClient();

				return await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.contractsCollectionId || "contracts",
					queries: [
						...scopeQueries,
						Query.select(["$id", "contractName", "contractType", "vendor"]),
						Query.limit(limit),
						Query.offset(offset),
					],
				});
			},
		);

		// Map contracts to simple format for dropdown
		const contractList = contracts.rows.map((contract: any) => ({
			id: contract.$id,
			name: contract.contractName || "Unnamed Contract",
			type: contract.contractType,
			vendor: contract.vendor,
		}));

		const paginationMeta = buildPaginationMeta(limit, offset, contracts.total);

		return successResponse(
			{ contracts: contractList },
			{
				requestId,
				pagination: paginationMeta,
			},
		);
	} catch (error) {
		console.error("Error fetching contracts from database:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch contracts"),
			500,
			{ requestId },
		);
	}
}
