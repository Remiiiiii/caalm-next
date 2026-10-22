import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

const MAX_SCREENSHOT_BYTES = 300 * 1024; // 300 KB per spec

/**
 * Uploads a client-captured error-screen image (base64 data URL) into the
 * same `screenshots` bucket the public-site crawl feature uses. Returns the
 * stored file id, or null if the data URL is missing/oversized/invalid —
 * callers still create the incident, just without a screenshot.
 */
export async function uploadIncidentScreenshot(
	dataUrl: string | undefined,
): Promise<string | null> {
	if (!dataUrl) return null;
	const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
	if (!match) return null;

	const buffer = Buffer.from(match[2], "base64");
	if (buffer.byteLength > MAX_SCREENSHOT_BYTES) return null;

	try {
		const { storage } = await createAdminClient();
		const fileId = ID.unique();
		await storage.createFile({
			bucketId: appwriteConfig.screenshotsBucketId!,
			fileId,
			file: InputFile.fromBuffer(buffer, `incident-${fileId}.${match[1]}`),
		});
		return fileId;
	} catch (error) {
		console.warn(
			"[SERVER] incident screenshot upload failed",
			error instanceof Error ? error.message : error,
		);
		return null;
	}
}
