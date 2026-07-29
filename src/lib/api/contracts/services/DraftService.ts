import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getContractTypeConfig,
	resolveDraftContractTypeId,
} from "@/lib/contracts/contractTypeConfigs";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { FileService } from "./FileService";

/**
 * Draft Service
 * Handles draft CRUD operations
 */
export class DraftService {
	/**
	 * Build a Buffer suitable for storage upload from draft file payload.
	 * JSON.stringify turns ArrayBuffer into {}, so prefer base64 / number[].
	 */
	static toUploadBuffer(parsed: any): Buffer | null {
		if (!parsed) return null;

		if (Array.isArray(parsed.arrayBuffer) && parsed.arrayBuffer.length > 0) {
			return Buffer.from(parsed.arrayBuffer);
		}

		if (
			typeof parsed.base64Content === "string" &&
			parsed.base64Content.length > 0
		) {
			return Buffer.from(parsed.base64Content, "base64");
		}

		return null;
	}

	/**
	 * Optimize processed file data by removing large binary fields
	 */
	static optimizeProcessedFileData(
		processedFileData: any,
		bucketFileId: string | null,
	): any {
		if (!processedFileData) return null;

		const parsed =
			typeof processedFileData === "string"
				? JSON.parse(processedFileData)
				: processedFileData;

		return {
			name: parsed.name,
			type: parsed.type,
			size: parsed.size,
			lastModified: parsed.lastModified,
			bucketFileId: bucketFileId || parsed.bucketFileId || null,
		};
	}

	/**
	 * Optimize form data by removing empty values and serializing dates.
	 */
	static optimizeFormData(formData: any): any {
		if (!formData || typeof formData !== "object") return formData;

		return Object.fromEntries(
			Object.entries(formData)
				.filter(([_, value]) => {
					if (value === null || value === undefined || value === "") return false;
					if (Array.isArray(value) && value.length === 0) return false;
					if (
						typeof value === "object" &&
						!(value instanceof Date) &&
						!Array.isArray(value) &&
						Object.keys(value).length === 0
					)
						return false;
					return true;
				})
				.map(([key, value]) => {
					if (value instanceof Date) {
						return [key, value.toISOString()];
					}
					return [key, value];
				}),
		);
	}

	/**
	 * Optimize extracted data: drop empty values and bulky AI metadata
	 * (confidence maps / field lists) that are not needed to resume a draft.
	 */
	static optimizeExtractedData(extractedData: any): any {
		if (!extractedData || typeof extractedData !== "object")
			return extractedData;

		const omitKeys = new Set([
			"fieldConfidence",
			"filledFieldNames",
			"lowConfidenceFields",
			"textLength",
			"filename",
		]);

		return Object.fromEntries(
			Object.entries(extractedData).filter(([key, value]) => {
				if (omitKeys.has(key)) return false;
				return value !== null && value !== undefined && value !== "";
			}),
		);
	}

	/** Ensure a JSON payload fits the Appwrite string column size. */
	static stringifyWithinLimit(
		value: unknown,
		maxChars: number,
		label: string,
	): string | null {
		if (value === null || value === undefined) return null;
		const json = typeof value === "string" ? value : JSON.stringify(value);
		if (json.length <= maxChars) return json;

		console.warn(
			`[DraftService] ${label} JSON is ${json.length} chars; truncating long string fields to fit ${maxChars}`,
		);

		if (typeof value !== "object" || value === null) {
			return json.slice(0, maxChars);
		}

		const pruned: Record<string, unknown> = { ...(value as object) };
		const longStringKeys = Object.entries(pruned)
			.filter(([, v]) => typeof v === "string" && (v as string).length > 200)
			.sort(
				(a, b) =>
					((b[1] as string).length || 0) - ((a[1] as string).length || 0),
			);

		for (const [key] of longStringKeys) {
			const current = JSON.stringify(pruned);
			if (current.length <= maxChars) break;
			const str = String(pruned[key]);
			const overBy = current.length - maxChars;
			const keep = Math.max(80, str.length - overBy - 20);
			pruned[key] = `${str.slice(0, keep)}…`;
		}

		const finalJson = JSON.stringify(pruned);
		if (finalJson.length <= maxChars) return finalJson;
		return finalJson.slice(0, maxChars);
	}

	/**
	 * Create or update draft
	 */
	static async saveDraft(
		ownerId: string,
		accountId: string,
		draftData: {
			draftId?: string;
			formData?: any;
			currentStep: number;
			processedFileData?: any;
			extractedData?: any;
			isCompleted?: boolean;
			selectedContractType?: string | null;
		},
	) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		// Optimize data
		let optimizedProcessedFileData = null;
		let bucketFileId: string | null = null;

		if (draftData.processedFileData) {
			const parsed =
				typeof draftData.processedFileData === "string"
					? JSON.parse(draftData.processedFileData)
					: draftData.processedFileData;

			// Upload to storage if user has progressed to step 2 or beyond
			if (draftData.currentStep > 1 && !parsed.bucketFileId) {
				const uploadBuffer = DraftService.toUploadBuffer(parsed);
				if (uploadBuffer) {
					try {
						bucketFileId = await FileService.uploadFileToStorage(
							uploadBuffer,
							parsed.name,
						);
					} catch (uploadError: any) {
						console.warn(
							"Failed to upload draft file to storage:",
							uploadError.message,
						);
					}
				}
			} else if (parsed.bucketFileId) {
				bucketFileId = parsed.bucketFileId;
			}

			optimizedProcessedFileData = DraftService.optimizeProcessedFileData(
				parsed,
				bucketFileId,
			);
		}

		const selectedContractType = resolveDraftContractTypeId({
			selectedContractType: draftData.selectedContractType,
			formData: draftData.formData,
		});

		const formDataWithType =
			draftData.formData && typeof draftData.formData === "object"
				? {
						...draftData.formData,
						...(selectedContractType ? { selectedContractType } : {}),
					}
				: selectedContractType
					? { selectedContractType }
					: draftData.formData;

		const optimizedFormData = DraftService.optimizeFormData(formDataWithType);
		const optimizedExtractedData = DraftService.optimizeExtractedData(
			draftData.extractedData,
		);

		// Create or update file row if needed
		let fileRow = null;
		if (draftData.processedFileData && draftData.currentStep > 1) {
			const parsed =
				typeof draftData.processedFileData === "string"
					? JSON.parse(draftData.processedFileData)
					: draftData.processedFileData;

			if (parsed?.name) {
				fileRow = await FileService.createOrUpdateFileRow(ownerId, accountId, {
					name: parsed.name,
					size: parsed.size,
					bucketFileId: bucketFileId || parsed.bucketFileId || null,
					contractName: optimizedFormData?.contractName,
				});
			}
		}

		const contentSteps = selectedContractType
			? getContractTypeConfig(selectedContractType)?.steps || 10
			: 10;
		const totalSteps = contentSteps + 1;

		const draftPayload = {
			ownerId,
			accountId,
			formData: DraftService.stringifyWithinLimit(
				optimizedFormData,
				65000,
				"formData",
			),
			currentStep: draftData.currentStep,
			processedFileData: DraftService.stringifyWithinLimit(
				optimizedProcessedFileData,
				65000,
				"processedFileData",
			),
			extractedData: DraftService.stringifyWithinLimit(
				optimizedExtractedData,
				65000,
				"extractedData",
			),
			progressPercentage: Math.round(
				(draftData.currentStep / totalSteps) * 100,
			),
			lastSavedAt: new Date().toISOString(),
			isCompleted: draftData.isCompleted || false,
			fileId: fileRow?.$id || null,
		};

		if (draftData.draftId) {
			// Update existing draft
			// Preserve existing fileId if no new file row was created
			if (!fileRow) {
				try {
					const existingDraft = await tablesDB.getRow({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.contractDraftsCollectionId,
						rowId: draftData.draftId,
					});
					if (existingDraft.fileId && !fileRow) {
						(draftPayload as any).fileId = existingDraft.fileId;
					}
				} catch (error) {
					console.warn(
						"Could not fetch existing draft to preserve fileId:",
						error,
					);
				}
			}

			return await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.contractDraftsCollectionId,
				rowId: draftData.draftId,
				data: draftPayload,
			});
		} else {
			// Create new draft
			return await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.contractDraftsCollectionId,
				rowId: ID.unique(),
				data: draftPayload,
			});
		}
	}

	/**
	 * Get drafts for owner
	 */
	static async getDrafts(
		ownerId: string,
		limit: number = 100,
		offset: number = 0,
	) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		const drafts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractDraftsCollectionId,
			queries: [
				Query.equal("ownerId", ownerId),
				Query.equal("isCompleted", false),
				Query.orderDesc("lastSavedAt"),
				Query.limit(limit),
				Query.offset(offset),
				Query.select([
					"$id",
					"ownerId",
					"accountId",
					"formData",
					"currentStep",
					"progressPercentage",
					"lastSavedAt",
					"isCompleted",
					"processedFileData",
					"extractedData",
				]),
			],
		});

		// Parse JSON fields safely
		return drafts.rows.map((draft: any) => {
			let formData = null;
			let processedFileData = null;
			let extractedData = null;

			try {
				formData = draft.formData ? JSON.parse(draft.formData) : null;
			} catch (e) {
				console.warn("Failed to parse formData for draft:", draft.$id, e);
			}

			try {
				processedFileData = draft.processedFileData
					? JSON.parse(draft.processedFileData)
					: null;
			} catch (e) {
				console.warn(
					"Failed to parse processedFileData for draft:",
					draft.$id,
					e,
				);
			}

			try {
				extractedData = draft.extractedData
					? JSON.parse(draft.extractedData)
					: null;
			} catch (e) {
				console.warn("Failed to parse extractedData for draft:", draft.$id, e);
			}

			return {
				...draft,
				formData,
				processedFileData,
				extractedData,
				selectedContractType: resolveDraftContractTypeId({
					formData,
				}),
			};
		});
	}

	/**
	 * Get draft by ID
	 */
	static async getDraftById(draftId: string) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		return await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractDraftsCollectionId,
			rowId: draftId,
		});
	}

	/**
	 * Delete draft and associated file
	 */
	static async deleteDraft(draftId: string, ownerId?: string) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		let draftOwnerId: string | null = ownerId || null;
		let fileId: string | null = null;

		try {
			const draft = await DraftService.getDraftById(draftId);
			draftOwnerId = draft.ownerId as string;

			const processedFileData = draft.processedFileData
				? JSON.parse(draft.processedFileData)
				: null;

			if (processedFileData?.name) {
				const file = await FileService.findFileByName(
					draftOwnerId,
					processedFileData.name,
				);
				if (file) {
					fileId = file.$id;
				}
			}
		} catch (error) {
			console.warn("Could not fetch draft:", error);
		}

		// Delete file if exists
		if (fileId) {
			try {
				await FileService.deleteFileRow(fileId, true);
				console.log(`Deleted file ${fileId} associated with draft ${draftId}`);
			} catch (fileDeleteError: any) {
				console.warn("Error deleting file:", fileDeleteError.message);
			}
		}

		// Delete the draft
		await tablesDB.deleteRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractDraftsCollectionId,
			rowId: draftId,
		});

		// Invalidate cache
		if (draftOwnerId) {
			try {
				await CacheManager.invalidate(
					CACHE_KEYS.contracts.drafts(draftOwnerId),
				);
			} catch (cacheError) {
				console.warn("Failed to invalidate cache:", cacheError);
			}
		}

		return { draftId, fileId: fileId || null };
	}

	/**
	 * Mark draft as completed
	 */
	static async markDraftAsCompleted(draftId: string) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractDraftsCollectionId,
			rowId: draftId,
			data: {
				isCompleted: true,
			},
		});
	}

	/**
	 * Find drafts by contract ID
	 */
	static async findDraftsByContractId(contractId: string, ownerId?: string) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		const queries = [Query.equal("contractId", contractId)];
		if (ownerId) {
			queries.push(Query.equal("ownerId", ownerId));
		}

		const draftsResponse = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractDraftsCollectionId,
			queries,
		});

		return draftsResponse.rows || [];
	}

	/**
	 * Find drafts by file name
	 */
	static async findDraftsByFileName(ownerId: string, fileName: string) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.contractDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		const allDraftsResponse = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractDraftsCollectionId,
			queries: [
				Query.equal("ownerId", ownerId),
				Query.orderDesc("lastSavedAt"),
				Query.limit(100),
			],
		});

		return allDraftsResponse.rows.filter((draft: any) => {
			try {
				const fileData = draft.processedFileData
					? JSON.parse(draft.processedFileData)
					: null;
				return fileData?.name === fileName;
			} catch {
				return false;
			}
		});
	}
}
