import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/contracts/middleware/auth.middleware";
import {
	FileService,
	MAX_ARRAYBUFFER_SIZE,
} from "@/lib/api/contracts/services/FileService";
import {
	errorResponse,
	generateRequestId,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/contracts/utils/response.util";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const body = await request.json();
		const { bucketFileId } = body;

		// Authentication
		const authError = await requireAuth(request);
		if (authError) return authError;

		if (!bucketFileId) {
			return validationErrorResponse("bucketFileId is required", requestId);
		}

		if (!appwriteConfig.bucketId) {
			return errorResponse(new Error("Bucket configuration missing"), 500, {
				requestId,
			});
		}

		// Get file metadata from storage
		const file = await FileService.getFileFromStorage(bucketFileId);

		// Check file size - stream large files instead of loading into memory
		if (file.sizeOriginal > MAX_ARRAYBUFFER_SIZE) {
			// For large files, return a download URL or stream
			return successResponse(
				{
					file: {
						name: file.name,
						type: file.mimeType,
						size: file.sizeOriginal,
						lastModified: file.$updatedAt
							? new Date(file.$updatedAt).getTime()
							: Date.now(),
						bucketFileId: file.$id,
						downloadUrl: FileService.getFileDownloadUrl(file.$id),
						note: "File is too large for ArrayBuffer conversion. Use downloadUrl instead.",
					},
				},
				{ requestId },
			);
		}

		// Download file content for smaller files
		const arrayBuffer = await FileService.downloadFileFromStorage(bucketFileId);

		return successResponse(
			{
				file: {
					name: file.name,
					type: file.mimeType,
					size: file.sizeOriginal,
					lastModified: file.$updatedAt
						? new Date(file.$updatedAt).getTime()
						: Date.now(),
					arrayBuffer: Array.from(new Uint8Array(arrayBuffer)), // Convert to array for JSON
					bucketFileId: file.$id,
				},
			},
			{ requestId },
		);
	} catch (error: any) {
		console.error("Error fetching file from storage:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to fetch file from storage"),
			500,
			{ requestId },
		);
	}
}
