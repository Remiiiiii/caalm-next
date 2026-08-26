import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { extractLicenseFromDocument } from "@/lib/ai/extractLicenseFromDocument";
import {
	errorResponse,
	generateRequestId,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";
import { isPlanLimitError } from "@/lib/billing/planLimits";
import { consumeAiExtractionForRequest } from "@/lib/billing/consumeAiExtractionForRequest";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.LICENSES.VIEW,
	});
	if (permissionCheck) return permissionCheck;

	return NextResponse.json({
		message: "License extraction API is working",
		status: "ok",
		timestamp: new Date().toISOString(),
	});
}

function planLimitResponse(error: unknown) {
	if (!isPlanLimitError(error)) return null;
	return NextResponse.json(
		{
			error: error.message,
			code: "PLAN_LIMIT_EXCEEDED",
			kind: error.kind,
			limit: error.limit,
			used: error.used,
			tier: error.tier,
		},
		{ status: 402 },
	);
}

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.CREATE,
		});
		if (permissionCheck) return permissionCheck;

		// Count against monthly AI quota before spending model tokens
		await consumeAiExtractionForRequest(request);

		const contentType = request.headers.get("content-type");

		if (contentType?.includes("application/json")) {
			let body: {
				fileName?: string;
				fileType?: string;
				fileSize?: number;
				fileContent?: string;
			};
			try {
				body = await request.json();
			} catch {
				return NextResponse.json(
					{ error: "Failed to parse JSON request body" },
					{ status: 400 },
				);
			}

			const { fileName: name, fileType: type, fileContent } = body;

			if (!fileContent) {
				return validationErrorResponse("No file content provided", requestId);
			}

			const fileName = name || "unknown";
			const fileType = type || "application/octet-stream";
			const buffer = Buffer.from(fileContent, "base64");

			const result = await extractLicenseFromDocument({
				buffer,
				fileName,
				fileType,
			});

			return successResponse(result.extractedData, { requestId });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		const result = await extractLicenseFromDocument({
			buffer,
			fileName: file.name,
			fileType: file.type,
		});

		return successResponse(result.extractedData, { requestId });
	} catch (error) {
		const limited = planLimitResponse(error);
		if (limited) return limited;

		console.error("License data extraction error:", error);
		const message =
			error instanceof Error ? error.message : "Failed to extract license data";
		const status =
			error && typeof error === "object" && "status" in error
				? Number((error as { status?: unknown }).status)
				: undefined;
		const httpStatus =
			status === 503 || status === 429
				? 503
				: /temporarily unavailable|try again/i.test(message)
					? 503
					: 500;

		return errorResponse(
			error instanceof Error ? error : new Error(message),
			httpStatus,
			{
				requestId,
				details: message,
				errorCode:
					httpStatus === 503 ? "EXTRACTION_SERVICE_UNAVAILABLE" : undefined,
			},
		);
	}
}
