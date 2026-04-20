import type { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import {
	buildPaginationMeta,
	parsePaginationParams,
} from "@/lib/api/licenses/utils/pagination.util";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/licenses/utils/response.util";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const { limit, offset } = parsePaginationParams(request);

		const { tablesDB } = await createAdminClient();

		const licenses = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.licensesCollectionId || "licenses",
			queries: [
				Query.select(["$id", "licenseName", "vendor", "licenseType", "status"]),
				Query.limit(limit),
				Query.offset(offset),
			],
		});

		const licenseList = licenses.rows.map((license: any) => ({
			id: license.$id,
			name: license.licenseName || "Unnamed License",
			vendor: license.vendor,
			type: license.licenseType,
			status: license.status,
		}));

		const paginationMeta = buildPaginationMeta(limit, offset, licenses.total);

		return successResponse(
			{ licenses: licenseList },
			{
				requestId,
				pagination: paginationMeta,
			},
		);
	} catch (error) {
		console.error("Error fetching licenses from database:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch licenses"),
			500,
			{ requestId },
		);
	}
}
