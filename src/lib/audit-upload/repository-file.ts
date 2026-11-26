import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export class RepositoryFileAccessError extends Error {}

/** Which collection a repository pick came from — drives how its bytes are reached. */
export type RepositoryRecordKind = "file" | "contract" | "license";

type RepositoryFileBytes = { buffer: Buffer; name: string; type: string };

/**
 * Downloads one `files`-collection row's bytes from storage, given its own
 * row id. Contracts and licenses don't store their document in the bucket
 * directly — each has its own `fileId` pointing at a row in this same
 * `files` collection (the upload flow in `file.actions.ts` always creates
 * one there first, then links it) — so this is the shared last hop for all
 * three record kinds.
 */
async function downloadFilesRowBytes(
	filesRowId: string,
): Promise<RepositoryFileBytes> {
	const { tablesDB, storage } = await createAdminClient();

	const filesRow = await tablesDB
		.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.filesCollectionId!,
			rowId: filesRowId,
		})
		.catch(() => null);

	const bucketFileId = String(filesRow?.bucketFileId ?? "");
	if (!filesRow || !bucketFileId) {
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
		name: String(filesRow.name ?? meta.name ?? "evidence"),
		type: meta.mimeType || "application/octet-stream",
	};
}

/**
 * Loads one record from the org's document repository by id and record
 * kind, and downloads its current bytes from storage. Used by the "send to
 * interview" action so a document already in the repository — a generic
 * upload, a contract, or a license — can be attached to a live Audit Lab
 * interview without re-uploading it from the browser.
 *
 * Every kind is authorized the same way: load the owning row scoped to the
 * caller's `orgId` first (never trust a client-supplied id alone), and only
 * then resolve its stored bytes.
 */
export async function loadRepositoryFileForOrg(
	recordId: string,
	orgId: string,
	recordKind: RepositoryRecordKind = "file",
): Promise<RepositoryFileBytes> {
	const { tablesDB } = await createAdminClient();

	if (recordKind === "file") {
		const row = await tablesDB
			.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.filesCollectionId!,
				rowId: recordId,
			})
			.catch(() => null);
		if (!row || String(row.orgId ?? "") !== orgId) {
			throw new RepositoryFileAccessError(
				"That file could not be found in your organization's repository.",
			);
		}
		return downloadFilesRowBytes(recordId);
	}

	if (recordKind === "contract") {
		const row = await tablesDB
			.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: recordId,
			})
			.catch(() => null);
		if (!row || String(row.orgId ?? "") !== orgId) {
			throw new RepositoryFileAccessError(
				"That contract could not be found in your organization's repository.",
			);
		}
		const filesRowId = String(row.fileId ?? "");
		if (!filesRowId) {
			throw new RepositoryFileAccessError("That contract has no stored file.");
		}
		return downloadFilesRowBytes(filesRowId);
	}

	// recordKind === "license"
	const license = await LicenseService.getLicenseByIdForOrg(recordId, orgId);
	if (!license) {
		throw new RepositoryFileAccessError(
			"That license could not be found in your organization's repository.",
		);
	}
	const filesRowId = String((license as { fileId?: string }).fileId ?? "");
	if (!filesRowId) {
		throw new RepositoryFileAccessError("That license has no stored file.");
	}
	return downloadFilesRowBytes(filesRowId);
}
