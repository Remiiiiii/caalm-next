import { FileService } from "@/lib/api/contracts/services/FileService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { loadEsignResource, type EsignResourceType } from "./resource";

function isPlausibleStorageId(id: string | null | undefined): boolean {
	if (!id || typeof id !== "string") return false;
	if (id.length > 36) return false;
	if (id.startsWith("_")) return false;
	return /^[a-zA-Z0-9_]+$/.test(id);
}

async function tryStorageDownload(fileId: string): Promise<Buffer | null> {
	if (!isPlausibleStorageId(fileId)) return null;
	try {
		return await FileService.downloadFileBufferFromStorage(fileId);
	} catch {
		return null;
	}
}

/** Files-collection row → storage bucket file id. */
async function bucketIdFromFilesDoc(fileDocId: string): Promise<string | null> {
	if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
		return null;
	}
	try {
		const { tablesDB } = await createAdminClient();
		const fileDoc = (await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.filesCollectionId,
			rowId: fileDocId,
		})) as Record<string, unknown>;
		const bucketFileId = String(fileDoc.bucketFileId || "");
		return isPlausibleStorageId(bucketFileId) ? bucketFileId : null;
	} catch {
		return null;
	}
}

/**
 * Contracts/licenses often store a Files row id (fileId/fileRef), not the
 * storage id. Resolve the same way `/api/files/download` does.
 */
export async function loadEsignDocumentBuffer(input: {
	documentFileId?: string;
	resourceType?: EsignResourceType;
	resourceId?: string;
}): Promise<Buffer> {
	const tried = new Set<string>();

	const tryId = async (raw: string | undefined): Promise<Buffer | null> => {
		const id = raw?.trim();
		if (!id || tried.has(id)) return null;
		tried.add(id);

		const direct = await tryStorageDownload(id);
		if (direct) return direct;

		const fromFiles = await bucketIdFromFilesDoc(id);
		if (fromFiles && !tried.has(fromFiles)) {
			tried.add(fromFiles);
			return tryStorageDownload(fromFiles);
		}
		return null;
	};

	const fromEnvelope = await tryId(input.documentFileId);
	if (fromEnvelope) return fromEnvelope;

	if (input.resourceType && input.resourceId) {
		const resource = await loadEsignResource(
			input.resourceType,
			input.resourceId,
		);
		if (resource?.documentFileId) {
			const fromResource = await tryId(resource.documentFileId);
			if (fromResource) return fromResource;
		}

		// Extra contract path: explicit fileId / bucketFileId columns
		try {
			const { tablesDB } = await createAdminClient();
			const tableId =
				input.resourceType === "license"
					? appwriteConfig.licensesCollectionId
					: appwriteConfig.contractsCollectionId;
			if (tableId && appwriteConfig.databaseId) {
				const row = (await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId,
					tableId,
					rowId: input.resourceId,
				})) as Record<string, unknown>;
				for (const key of ["bucketFileId", "fileId", "fileRef"] as const) {
					const buf = await tryId(String(row[key] || ""));
					if (buf) return buf;
				}
			}
		} catch {
			/* fall through */
		}
	}

	throw new Error("Could not resolve document bytes");
}

/** Prefer storing a real storage id on new envelopes when possible. */
export async function resolveStorageFileId(
	documentFileId: string,
): Promise<string> {
	const id = documentFileId.trim();
	if (!id) return id;
	if (await tryStorageDownload(id)) return id;
	const fromFiles = await bucketIdFromFilesDoc(id);
	return fromFiles || id;
}
