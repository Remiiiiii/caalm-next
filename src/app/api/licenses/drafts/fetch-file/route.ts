import type { NextRequest } from "next/server";
import {
	FileService,
	MAX_ARRAYBUFFER_SIZE,
} from "@/lib/api/contracts/services/FileService";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import {
	errorResponse,
	generateRequestId,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/licenses/utils/response.util";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const body = await request.json();
		const { bucketFileId } = body;

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

		const file = await FileService.getFileFromStorage(bucketFileId);

		if (file.sizeOriginal > MAX_ARRAYBUFFER_SIZE) {
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
					arrayBuffer: Array.from(new Uint8Array(arrayBuffer)),
					bucketFileId: file.$id,
				},
			},
			{ requestId },
		);
	} catch (error: unknown) {
		console.error("Error fetching license draft file from storage:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to fetch file from storage"),
			500,
			{ requestId },
		);
	}
}
