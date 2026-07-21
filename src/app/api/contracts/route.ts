import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/contracts/middleware/auth.middleware";
import { parsePaginationParams } from "@/lib/api/contracts/utils/pagination.util";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/contracts/utils/response.util";
import { createSAMApiService } from "@/lib/sam-api";
import type {
	NOTICE_TYPES,
	SAMContractSearchParams,
	SET_ASIDE_TYPES,
} from "@/lib/sam-config";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const { searchParams } = new URL(request.url);

		// Parse pagination parameters
		const { limit, offset } = parsePaginationParams(request);

		// Extract search parameters
		const params: Omit<SAMContractSearchParams, "api_key"> = {
			keyword: searchParams.get("keyword") || undefined,
			limit,
			offset,
			noticeType:
				(searchParams.get("noticeType") as keyof typeof NOTICE_TYPES) ||
				undefined,
			setAside:
				(searchParams.get("setAside") as keyof typeof SET_ASIDE_TYPES) ||
				undefined,
			naicsCode: searchParams.get("naicsCode") || undefined,
			postedFrom: searchParams.get("postedFrom") || "",
			postedTo: searchParams.get("postedTo") || "",
			state: searchParams.get("state") || undefined,
			dept: searchParams.get("dept") || undefined,
		};

		// Build cache key from search params
		const cacheKey = `${CACHE_KEYS.contracts.all()}:${JSON.stringify(params)}`;

		// Cache contract search results (10 minutes TTL)
		const results = await CacheManager.withCache(
			"contracts",
			cacheKey,
			async () => {
				// Create SAM API service instance
				const samService = createSAMApiService();

				// Search for contracts
				const contractResults = await samService.searchContracts(params);
				return contractResults;
			},
			CACHE_TTLS.long,
		);

		return successResponse(results, { requestId });
	} catch (error) {
		console.error("Contracts API error:", error);

		// Check if it's an API key error
		if (
			error instanceof Error &&
			error.message.includes("SAM.gov API key is required")
		) {
			return errorResponse(
				"SAM.gov API key not configured. Please check your environment variables.",
				400,
				{
					requestId,
					details: { errorCode: "API_KEY_MISSING" },
				},
			);
		}

		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch contracts"),
			500,
			{ requestId },
		);
	}
}

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	// Authentication
	const authError = await requireAuth(request);
	if (authError) return authError;

	try {
		const body = await request.json();

		// Parse pagination from body or use defaults
		const limit = body.limit
			? Math.min(Math.max(parseInt(String(body.limit), 10) || 25, 1), 1000)
			: 25;
		const offset = body.offset
			? Math.max(parseInt(String(body.offset), 10) || 0, 0)
			: 0;

		// Extract search parameters from POST body
		const params: Omit<SAMContractSearchParams, "api_key"> = {
			keyword: body.keyword,
			limit,
			offset,
			noticeType: body.noticeType,
			setAside: body.setAside,
			naicsCode: body.naicsCode,
			postedFrom: body.postedFrom,
			postedTo: body.postedTo,
			state: body.state,
			dept: body.dept,
		};

		// Build cache key from search params
		const cacheKey = `${CACHE_KEYS.contracts.all()}:${JSON.stringify(params)}`;

		// Cache contract search results (10 minutes TTL)
		const results = await CacheManager.withCache(
			"contracts",
			cacheKey,
			async () => {
				// Create SAM API service instance
				const samService = createSAMApiService();

				// Search for contracts
				const contractResults = await samService.searchContracts(params);
				return contractResults;
			},
			CACHE_TTLS.long,
		);

		return successResponse(results, { requestId });
	} catch (error) {
		console.error("Contracts API error:", error);

		// Check if it's an API key error
		if (
			error instanceof Error &&
			error.message.includes("SAM.gov API key is required")
		) {
			return errorResponse(
				"SAM.gov API key not configured. Please check your environment variables.",
				400,
				{
					requestId,
					details: { errorCode: "API_KEY_MISSING" },
				},
			);
		}

		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch contracts"),
			500,
			{ requestId },
		);
	}
}
