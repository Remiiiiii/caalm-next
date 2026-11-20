import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export function practiceRecordingPath(attemptId: string): string {
	return `/api/audit-lab/practice/${attemptId}/recording`;
}

/** Download an egress file and store it in the private practice recordings bucket. */
export async function storePracticeRecordingFromUrl(params: {
	attemptId: string;
	orgId: string;
	downloadUrl: string;
}): Promise<{ fileId: string; recordingUrl: string }> {
	const res = await fetch(params.downloadUrl);
	if (!res.ok) {
		throw new Error(`Could not download egress file (${res.status})`);
	}
	const buffer = Buffer.from(await res.arrayBuffer());
	const contentType = res.headers.get("content-type") || "video/mp4";
	const ext = contentType.includes("webm") ? "webm" : "mp4";
	const filename = `practice-${params.attemptId}.${ext}`;

	const { storage } = await createAdminClient();
	const fileId = ID.unique();
	await storage.createFile({
		bucketId: appwriteConfig.auditLabPracticeRecordingsBucketId,
		fileId,
		file: InputFile.fromBuffer(buffer, filename),
		permissions: [],
	});

	return {
		fileId,
		recordingUrl: practiceRecordingPath(params.attemptId),
	};
}

export async function getPracticeRecordingBytes(fileId: string): Promise<{
	body: ArrayBuffer;
	mimeType: string;
	filename: string;
}> {
	const { storage } = await createAdminClient();
	const bucketId = appwriteConfig.auditLabPracticeRecordingsBucketId;
	const meta = await storage.getFile({ bucketId, fileId });
	const downloaded = await storage.getFileDownload({ bucketId, fileId });
	const body =
		downloaded instanceof ArrayBuffer
			? downloaded
			: await new Response(downloaded as BodyInit).arrayBuffer();
	return {
		body,
		mimeType: meta.mimeType || "video/mp4",
		filename: meta.name || `practice-${fileId}.mp4`,
	};
}

export async function deletePracticeRecordingFile(fileId: string): Promise<void> {
	const { storage } = await createAdminClient();
	await storage.deleteFile({
		bucketId: appwriteConfig.auditLabPracticeRecordingsBucketId,
		fileId,
	});
}
