import type { NextRequest } from "next/server";
import {
	errorResponse,
	generateRequestId,
	notFoundResponse,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { constructFileUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const { searchParams } = new URL(request.url);
		const contractId = searchParams.get("contractId");

		if (!contractId) {
			return validationErrorResponse("Contract ID is required", requestId);
		}

		// Cache key for specific contract
		const cacheKey = CACHE_KEYS.contracts.details(contractId);

		// Fetch contract details with caching (5 minutes TTL)
		const contractData = await CacheManager.withCache(
			"contracts/details",
			cacheKey,
			async () => {
				const { tablesDB } = await createAdminClient();

				// Fetch contract from database
				const contract = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.contractsCollectionId || "contracts",
					rowId: contractId,
				});

				if (!contract) {
					return null;
				}

				let fileUrl = "";
				let fileExtension = "pdf";

				// If contract has fileId, fetch file details
				if (contract.fileId) {
					try {
						const fileDoc = await tablesDB.getRow({
							databaseId: appwriteConfig.databaseId || "default-db",
							tableId: appwriteConfig.filesCollectionId || "files",
							rowId: contract.fileId,
							queries: [],
						});

						if (fileDoc?.url) {
							fileUrl = fileDoc.url;
						}
						if (fileDoc?.extension) {
							fileExtension = fileDoc.extension;
						}
					} catch (fileError) {
						console.warn("Failed to fetch file details:", fileError);
						// Try to construct file URL from storage if fileId is a storage file ID
						try {
							fileUrl = constructFileUrl(contract.fileId);
						} catch (storageError) {
							console.warn("Failed to construct file URL:", storageError);
						}
					}
				}

				return {
					contractId: contract.$id,
					contractName: contract.contractName || "Unnamed Contract",
					description: contract.description || "",
					contractType: contract.contractType || "",
					vendor: contract.vendor || "",
					amount: contract.amount || "",
					contractNumber: contract.contractNumber || "",
					contractExpiryDate: contract.contractExpiryDate || "",
					status: contract.status || "",
					fileId: contract.fileId || "",
					fileUrl: fileUrl,
					fileExtension: fileExtension,
				};
			},
		);

		if (!contractData) {
			return notFoundResponse("Contract", requestId);
		}

		return successResponse(contractData, { requestId });
	} catch (error) {
		console.error("Error fetching contract details:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to fetch contract details"),
			500,
			{ requestId },
		);
	}
}
