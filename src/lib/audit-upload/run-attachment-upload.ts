import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	markAttachmentAttached,
	markAttachmentFailed,
	markAttachmentScanning,
} from "@/lib/audit-lab/service";
import { hashAuditContent } from "@/lib/audit-upload/content-hash";
import { scanAttachmentFile } from "./scan";

/**
 * Stores the file and runs it through the mandatory scan step, landing the
 * given row at `attached` or `failed`. Shared by the initial upload (row just
 * created, status "uploading") and a retry (same row, re-uploading bytes) —
 * never creates a new row itself.
 */
export async function runAttachmentUpload(
	rowId: string,
	file: File,
): Promise<{ status: "attached" | "failed" }> {
	try {
		const bytes = Buffer.from(await file.arrayBuffer());
		const { storage } = await createAdminClient();
		const uploaded = await storage.createFile({
			bucketId: appwriteConfig.auditLabPracticeRecordingsBucketId,
			fileId: ID.unique(),
			file: InputFile.fromBuffer(bytes, file.name),
		});

		await markAttachmentScanning(rowId, uploaded.$id);
		const scanResult = await scanAttachmentFile(bytes, file.type || "");
		if (!scanResult.ok) {
			await markAttachmentFailed(
				rowId,
				scanResult.reason ?? "Failed compliance scan",
			);
			return { status: "failed" };
		}
		await markAttachmentAttached(rowId, hashAuditContent(bytes));
		return { status: "attached" };
	} catch (uploadError) {
		console.error(
			"[SERVER] attachment upload/scan failed, marking row failed:",
			uploadError,
		);
		await markAttachmentFailed(rowId, "Upload failed");
		return { status: "failed" };
	}
}
