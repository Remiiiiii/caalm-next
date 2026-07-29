import { type NextRequest, NextResponse } from "next/server";
import { extractLicenseFromDocument } from "@/lib/ai/extractLicenseFromDocument";
import {
	errorResponse,
	generateRequestId,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";

export async function GET() {
	return NextResponse.json({
		message: "License extraction API is working",
		status: "ok",
		timestamp: new Date().toISOString(),
	});
}

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	try {
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

			const {
				fileName: name,
				fileType: type,
				fileContent,
			} = body;

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
		console.error("License data extraction error:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to extract license data"),
			500,
			{
				requestId,
				details: error instanceof Error ? error.message : "Unknown error",
			},
		);
	}
}
