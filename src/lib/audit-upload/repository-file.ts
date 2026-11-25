import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export class RepositoryFileAccessError extends Error {}

/**
 * Loads one row from the generic file repository (the `files` collection —
 * what /documents, /images, etc. list) by id, scoped to the caller's org,
 * and downloads its bytes from storage. Used by the "send to interview"
 * action so a document already in the repository can be attached to a live
 * Audit Lab interview without re-uploading it from the browser.
 *
 * Scoped to the `files` collection only — contracts and licenses live in
 * separate tables with their own bucket wiring (see `FileService` /
 * `contract-row-to-file.ts`) and aren't covered by this path yet.
 */
export async function loadRepositoryFileForOrg(
	fileId: string,
	orgId: string,
): Promise<{ buffer: Buffer; name: string; type: string }> {
	const { tablesDB, storage } = await createAdminClient();

	const row = await tablesDB
		.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.filesCollectionId!,
			rowId: fileId,
		})
		.catch(() => null);

	if (!row || String(row.orgId ?? "") !== orgId) {
		throw new RepositoryFileAccessError(
			"That file could not be found in your organization's repository.",
		);
	}

	const bucketFileId = String(row.bucketFileId ?? "");
	if (!bucketFileId) {
		throw new RepositoryFileAccessError("That file has no stored content.");
	}

	const [arrayBuffer, meta] = await Promise.all([
		storage.getFileDownload({
			bucketId: appwriteConfig.bucketId!,
			fileId: bucketFileId,
		}),
		storage.getFile({
			bucketId: appwriteConfig.bucketId!,
			fileId: bucketFileId,
		}),
	]);

	return {
		buffer: Buffer.from(arrayBuffer),
		name: String(row.name ?? meta.name ?? "evidence"),
		type: meta.mimeType || "application/octet-stream",
	};
}
