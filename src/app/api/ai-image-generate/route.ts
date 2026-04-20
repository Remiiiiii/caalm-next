import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getImagineArtService } from "@/lib/ai-image-service";
import { getUserPermissions } from "@/lib/rbac/permissions";
import { checkImageGenerationRateLimit } from "@/lib/services/image-generation-rate-limit";

const _RATE_LIMIT_MAX_REQUESTS = 10; // 10 images per hour per user

export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		// Check permissions
		const userPermissions = await getUserPermissions(user.$id);
		if (!userPermissions.includes(PERMISSIONS.AI.IMAGE_GENERATE)) {
			return NextResponse.json(
				{
					success: false,
					error: "Permission denied. You need ai.image_generate permission.",
				},
				{ status: 403 },
			);
		}

		// Parse request body
		const body = await request.json();
		const { prompt, options } = body;

		if (!prompt || typeof prompt !== "string") {
			return NextResponse.json(
				{ success: false, error: "Prompt is required" },
				{ status: 400 },
			);
		}

		// Validate prompt length
		const maxLength = 2000;
		if (prompt.length > maxLength) {
			return NextResponse.json(
				{
					success: false,
					error: `Prompt too long (max ${maxLength} characters)`,
				},
				{ status: 400 },
			);
		}

		// Check rate limit
		const rateLimit = await checkImageGenerationRateLimit(user.$id);
		if (!rateLimit.allowed) {
			return NextResponse.json(
				{
					success: false,
					error: `Rate limit exceeded. Please try again after ${new Date(
						rateLimit.resetAt,
					).toLocaleTimeString()}`,
				},
				{ status: 429 },
			);
		}

		// Check API health
		const service = getImagineArtService();
		const isHealthy = await service.healthCheck();

		if (!isHealthy) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Image generation service is unavailable. Please check API key configuration.",
				},
				{ status: 503 },
			);
		}

		// Generate image
		const result = await service.generateImage(prompt, options || {});

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			imageUrl: result.imageUrl,
			generationTime: result.generationTime,
			rateLimit: {
				remaining: rateLimit.remaining,
				resetAt: rateLimit.resetAt,
			},
		});
	} catch (error: any) {
		console.error("Image generation error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "Failed to generate image",
			},
			{ status: 500 },
		);
	}
}

// Health check endpoint
export async function GET(_request: NextRequest) {
	try {
		const service = getImagineArtService();
		const provider = service.getProvider();
		const isHealthy = await service.healthCheck();

		// Diagnostic info (only in development)
		const diagnostic =
			process.env.NODE_ENV === "development"
				? {
						hasApiKey: !!process.env.IMAGINE_ART_API_KEY,
						apiKeyLength: process.env.IMAGINE_ART_API_KEY?.length || 0,
						apiKeyPrefix:
							process.env.IMAGINE_ART_API_KEY?.substring(0, 4) || "none",
					}
				: undefined;

		return NextResponse.json({
			healthy: isHealthy,
			provider,
			service: "imagine-art-1.5",
			baseUrl: "https://api.vyro.ai/v2/image/generations",
			...(diagnostic && { diagnostic }),
		});
	} catch (error: any) {
		return NextResponse.json(
			{ healthy: false, error: error.message },
			{ status: 503 },
		);
	}
}
