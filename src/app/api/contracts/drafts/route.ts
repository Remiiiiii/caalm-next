import type { NextRequest } from "next/server";
import { requireAuthAndOwner } from "@/lib/api/contracts/middleware/auth.middleware";
import { parseAndValidateQuery } from "@/lib/api/contracts/middleware/validation.middleware";
import {
	draftDeleteSchema,
	draftQuerySchema,
} from "@/lib/api/contracts/schemas/draft.schema";
import { DraftService } from "@/lib/api/contracts/services/DraftService";
import {
	errorResponse,
	generateRequestId,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";
import { appwriteConfig } from "@/lib/appwrite/config";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const body = await request.json();
		const {
			ownerId,
			accountId,
			formData,
			currentStep,
			processedFileData,
			extractedData,
		} = body;

		// Authentication and authorization
		const authError = await requireAuthAndOwner(request, ownerId);
		if (authError) return authError;

		if (!ownerId || !accountId) {
			return validationErrorResponse(
				"Owner ID and Account ID are required",
				requestId,
			);
		}

		// Use DraftService to save draft
		const draft = await DraftService.saveDraft(body.ownerId, body.accountId, {
			draftId: body.draftId,
			formData: body.formData,
			currentStep: body.currentStep,
			processedFileData: body.processedFileData,
			extractedData: body.extractedData,
			isCompleted: body.isCompleted || false,
		});

		// Invalidate cache for this owner's drafts to ensure fresh data
		try {
			await CacheManager.invalidate(CACHE_KEYS.contracts.drafts(ownerId));
		} catch (cacheError) {
			// Don't fail the request if cache invalidation fails
			console.warn("Failed to invalidate cache:", cacheError);
		}

		return successResponse(
			{
				draft,
			},
			{ requestId, message: "Draft saved successfully" },
		);
	} catch (error: any) {
		console.error("Error saving draft:", {
			requestId,
			message: error?.message,
			code: error?.code,
			type: error?.type,
			response: error?.response,
			stack: error?.stack,
			name: error?.name,
			fullError: error,
		});

		return errorResponse(
			error instanceof Error ? error : new Error("Failed to save draft"),
			500,
			{
				requestId,
				details:
					process.env.NODE_ENV === "development"
						? {
								code: error?.code,
								type: error?.type,
							}
						: undefined,
			},
		);
	}
}

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		// Validate query parameters
		let query;
		try {
			query = parseAndValidateQuery(request, draftQuerySchema);
		} catch (validationError: any) {
			console.error("Draft query validation error:", {
				message: validationError?.message,
				stack: validationError?.stack,
				url: request.url,
			});
			return validationErrorResponse(
				validationError?.message ||
					"Invalid query parameters: ownerId is required",
				requestId,
			);
		}

		if (!query.ownerId) {
			return validationErrorResponse(
				"ownerId query parameter is required",
				requestId,
			);
		}

		// Authentication and authorization
		const authError = await requireAuthAndOwner(request, query.ownerId);
		if (authError) {
			console.error("Authentication error in drafts GET:", {
				status: authError.status,
				ownerId: query.ownerId,
			});
			return authError;
		}

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			return errorResponse(new Error("Database configuration missing"), 500, {
				requestId,
			});
		}

		// Use cache for lightning-fast response
		const cacheKey = CACHE_KEYS.contracts.drafts(query.ownerId);
		const cachedData = await CacheManager.withCache(
			"contracts/drafts",
			cacheKey,
			async () => {
				return await DraftService.getDrafts(query.ownerId);
			},
			CACHE_TTLS.medium,
		);

		const response = successResponse({ drafts: cachedData }, { requestId });
		response.headers.set(
			"Cache-Control",
			`s-maxage=${CACHE_TTLS.medium}, stale-while-revalidate`,
		);
		response.headers.set("X-Cache", "HIT");
		return response;
	} catch (error: any) {
		console.error("Error fetching drafts:", {
			message: error?.message,
			stack: error?.stack,
			name: error?.name,
			requestId,
		});
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch drafts"),
			500,
			{
				requestId,
				details:
					process.env.NODE_ENV === "development"
						? {
								message: error?.message,
								stack: error?.stack,
							}
						: undefined,
			},
		);
	}
}

export async function DELETE(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		// Validate query parameters
		const query = parseAndValidateQuery(request, draftDeleteSchema);

		// Get draft to verify owner access
		let draftOwnerId: string | null = query.ownerId || null;
		try {
			const draft = await DraftService.getDraftById(query.draftId);
			draftOwnerId = draft.ownerId as string;

			// Verify owner access
			const ownerError = await requireAuthAndOwner(request, draftOwnerId);
			if (ownerError) return ownerError;
		} catch (error) {
			console.warn("Could not fetch draft:", error);
		}

		// Use DraftService to delete draft
		const deleted = await DraftService.deleteDraft(
			query.draftId,
			draftOwnerId || undefined,
		);

		return successResponse(
			{
				deleted: {
					draft: deleted.draftId,
					file: deleted.fileId || null,
				},
			},
			{ requestId, message: "Draft deleted successfully" },
		);
	} catch (error: any) {
		console.error("Error deleting draft:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to delete draft"),
			500,
			{ requestId },
		);
	}
}
