import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { constructFileUrl, getFileType } from "@/lib/utils";

/**
 * File Service
 * Handles file upload, storage, and retrieval operations
 */
export class FileService {
	/**
	 * Upload file to storage and return bucket file ID
	 */
	static async uploadFileToStorage(
		arrayBuffer: ArrayBuffer | Buffer,
		fileName: string,
	): Promise<string> {
		if (!appwriteConfig.bucketId) {
			throw new Error("Bucket configuration missing");
		}

		const { storage } = await createAdminClient();
		const inputFile = InputFile.fromBuffer(Buffer.from(arrayBuffer), fileName);

		const bucketFile = await storage.createFile({
			bucketId: appwriteConfig.bucketId,
			fileId: ID.unique(),
			file: inputFile,
		});

		return bucketFile.$id;
	}

	/**
	 * Get file from storage by bucket file ID
	 */
	static async getFileFromStorage(bucketFileId: string) {
		if (!appwriteConfig.bucketId) {
			throw new Error("Bucket configuration missing");
		}

		const { storage } = await createAdminClient();
		return await storage.getFile({
			bucketId: appwriteConfig.bucketId,
			fileId: bucketFileId,
		});
	}

	/**
	 * Download file content from storage
	 */
	static async downloadFileFromStorage(bucketFileId: string) {
		if (!appwriteConfig.bucketId) {
			throw new Error("Bucket configuration missing");
		}

		const { storage } = await createAdminClient();
		return await storage.getFileDownload({
			bucketId: appwriteConfig.bucketId,
			fileId: bucketFileId,
		});
	}

	/**
	 * Get file download URL
	 */
	static getFileDownloadUrl(bucketFileId: string): string {
		if (!appwriteConfig.bucketId) {
			throw new Error("Bucket configuration missing");
		}
		return constructFileUrl(bucketFileId);
	}

	/**
	 * Stream file from storage (for large files)
	 */
	static async streamFileFromStorage(
		bucketFileId: string,
	): Promise<ReadableStream> {
		if (!appwriteConfig.bucketId) {
			throw new Error("Bucket configuration missing");
		}

		const { storage } = await createAdminClient();
		const response = await storage.getFileDownload({
			bucketId: appwriteConfig.bucketId,
			fileId: bucketFileId,
		});

		// Convert Response to ReadableStream
		if (response.body) {
			return response.body;
		}

		// Fallback: convert to stream
		const arrayBuffer = await response.arrayBuffer();
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new Uint8Array(arrayBuffer));
				controller.close();
			},
		});
		return stream;
	}

	/**
	 * Create or update file row in Files collection
	 */
	static async createOrUpdateFileRow(
		ownerId: string,
		accountId: string,
		fileData: {
			name: string;
			size?: number;
			bucketFileId?: string;
			contractName?: string;
		},
	) {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
			throw new Error("Database configuration missing");
		}

		// Check if file already exists
		const existingFiles = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.filesCollectionId,
			queries: [
				Query.equal("owner", ownerId),
				Query.equal("name", fileData.name),
				Query.orderDesc("$createdAt"),
				Query.limit(1),
			],
		});

		const defaultOrg = await getUserDefaultOrganization(ownerId);
		if (!defaultOrg) {
			throw new Error("Could not get default organization for file creation");
		}

		const fileType = getFileType(fileData.name);
		const fileDocument: any = {
			name: fileData.name,
			type: fileType.type,
			extension: fileType.extension,
			size: fileData.size || 0,
			owner: ownerId,
			accountId,
			users: [],
			orgId: defaultOrg.orgId,
			url: fileData.bucketFileId ? constructFileUrl(fileData.bucketFileId) : "",
			bucketFileId: fileData.bucketFileId || "",
			isContract: true,
		};

		if (fileData.contractName) {
			fileDocument.contractName = fileData.contractName;
		}

		if (existingFiles.total > 0) {
			// Update existing file
			const updateData: any = {};
			if (fileData.contractName) {
				updateData.contractName = fileData.contractName;
			}
			if (fileData.bucketFileId) {
				updateData.bucketFileId = fileData.bucketFileId;
				updateData.url = constructFileUrl(fileData.bucketFileId);
			}

			if (Object.keys(updateData).length > 0) {
				return await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.filesCollectionId,
					rowId: existingFiles.rows[0].$id,
					data: updateData,
				});
			}
			return existingFiles.rows[0];
		} else {
			// Create new file
			return await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.filesCollectionId,
				rowId: ID.unique(),
				data: fileDocument,
			});
		}
	}

	/**
	 * Delete file row and optionally clear owner relationship first
	 */
	static async deleteFileRow(fileId: string, clearOwnerFirst: boolean = true) {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
			throw new Error("Database configuration missing");
		}

		if (clearOwnerFirst) {
			try {
				const fileDoc = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.filesCollectionId,
					rowId: fileId,
				});
				if (fileDoc.owner) {
					await tablesDB.updateRow({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.filesCollectionId,
						rowId: fileId,
						data: { owner: null },
					});
				}
			} catch (clearError: any) {
				console.warn("Could not clear owner relationship:", clearError.message);
				// Continue with deletion
			}
		}

		await tablesDB.deleteRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.filesCollectionId,
			rowId: fileId,
		});
	}

	/**
	 * Find file by name and owner
	 */
	static async findFileByName(ownerId: string, fileName: string) {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
			throw new Error("Database configuration missing");
		}

		const files = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.filesCollectionId,
			queries: [
				Query.equal("owner", ownerId),
				Query.equal("name", fileName),
				Query.limit(1),
			],
		});

		return files.total > 0 ? files.rows[0] : null;
	}
}
