import { type NextRequest, NextResponse } from "next/server";
import { extractContractFromDocument } from "@/lib/ai/extractContractFromDocument";
import {
	errorResponse,
	generateRequestId,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";
import { isPlanLimitError } from "@/lib/billing/planLimits";
import { consumeAiExtractionForRequest } from "@/lib/billing/consumeAiExtractionForRequest";

export async function GET() {
	return NextResponse.json({
		message: "Contract extraction API is working",
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
		// Count against monthly AI quota before spending model tokens
		await consumeAiExtractionForRequest(request);

		const contentType = request.headers.get("content-type");

		if (contentType?.includes("application/json")) {
			let body: {
				fileName?: string;
				fileType?: string;
				fileSize?: number;
				fileContent?: string;
				contractTypeId?: string | null;
				contractTypeLabel?: string | null;
			};
			try {
				body = await request.json();
			} catch {
				return NextResponse.json(
					{ error: "Failed to parse JSON request body" },
					{ status: 400 },
				);
			}

			const {
				fileName: name,
				fileType: type,
				fileContent,
				contractTypeId,
				contractTypeLabel,
			} = body;

			if (!fileContent) {
				return validationErrorResponse("No file content provided", requestId);
			}

			const fileName = name || "unknown";
			const fileType = type || "application/octet-stream";
			const buffer = Buffer.from(fileContent, "base64");

			const result = await extractContractFromDocument({
				buffer,
				fileName,
				fileType,
				contractTypeId,
				contractTypeLabel,
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
		const contractTypeId = formData.get("contractTypeId")?.toString() || null;
		const contractTypeLabel =
			formData.get("contractTypeLabel")?.toString() || null;

		const result = await extractContractFromDocument({
			buffer,
			fileName: file.name,
			fileType: file.type,
			contractTypeId,
			contractTypeLabel,
		});

		return successResponse(result.extractedData, { requestId });
	} catch (error) {
		const limited = planLimitResponse(error);
		if (limited) return limited;

		console.error("Contract data extraction error:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to extract contract data"),
			500,
			{
				requestId,
				details: error instanceof Error ? error.message : "Unknown error",
			},
		);
	}
}
