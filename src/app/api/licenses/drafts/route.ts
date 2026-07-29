import type { NextRequest } from "next/server";
import { ID, Query } from "node-appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { FileService } from "@/lib/api/contracts/services/FileService";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import {
	errorResponse,
	generateRequestId,
	successResponse,
	validationErrorResponse,
} from "@/lib/api/licenses/utils/response.util";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

/**
 * License Draft Service - Simple inline service for license drafts
 */
class LicenseDraftService {
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
	 * Optimize form data by removing empty values (keep Date instances)
	 */
	static optimizeFormData(formData: any): any {
		if (!formData || typeof formData !== "object") return formData;

		return Object.fromEntries(
			Object.entries(formData)
				.filter(([_, value]) => {
					if (value === null || value === undefined || value === "")
						return false;
					if (Array.isArray(value) && value.length === 0) return false;
					if (
						typeof value === "object" &&
						!(value instanceof Date) &&
						!Array.isArray(value) &&
						Object.keys(value).length === 0
					) {
						return false;
					}
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
	 * Optimize extracted data by removing empty values and bulky AI metadata
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

	static stringifyWithinLimit(
		value: unknown,
		maxChars: number,
		label: string,
	): string | null {
		if (value === null || value === undefined) return null;
		const json = typeof value === "string" ? value : JSON.stringify(value);
		if (json.length <= maxChars) return json;

		console.warn(
			`[LicenseDraftService] ${label} JSON is ${json.length} chars; truncating to fit ${maxChars}`,
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
			totalSteps?: number;
		},
	) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.licenseDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		let bucketFileId: string | null = null;
		let optimizedProcessedFileData = null;

		if (draftData.processedFileData) {
			const parsed =
				typeof draftData.processedFileData === "string"
					? JSON.parse(draftData.processedFileData)
					: draftData.processedFileData;

			if (!parsed.bucketFileId) {
				const uploadBuffer = LicenseDraftService.toUploadBuffer(parsed);
				if (uploadBuffer) {
					try {
						bucketFileId = await FileService.uploadFileToStorage(
							uploadBuffer,
							parsed.name || "license-draft.pdf",
						);
					} catch (uploadError: unknown) {
						const message =
							uploadError instanceof Error
								? uploadError.message
								: String(uploadError);
						console.warn(
							"Failed to upload license draft file to storage:",
							message,
						);
					}
				}
			} else {
				bucketFileId = parsed.bucketFileId;
			}

			optimizedProcessedFileData =
				LicenseDraftService.optimizeProcessedFileData(parsed, bucketFileId);
		}

		const optimizedFormData = LicenseDraftService.optimizeFormData(
			draftData.formData,
		);
		const optimizedExtractedData = LicenseDraftService.optimizeExtractedData(
			draftData.extractedData,
		);

		const totalSteps = draftData.totalSteps || 2; // Default to 2 steps for licenses
		const progressPercentage = Math.round(
			(draftData.currentStep / totalSteps) * 100,
		);

		const draftPayload = {
			ownerId,
			accountId,
			formData: LicenseDraftService.stringifyWithinLimit(
				optimizedFormData,
				5000,
				"formData",
			),
			currentStep: draftData.currentStep,
			processedFileData: LicenseDraftService.stringifyWithinLimit(
				optimizedProcessedFileData,
				5000,
				"processedFileData",
			),
			extractedData: LicenseDraftService.stringifyWithinLimit(
				optimizedExtractedData,
				3000,
				"extractedData",
			),
			progressPercentage,
			lastSavedAt: new Date().toISOString(),
			isCompleted: draftData.isCompleted || false,
			...(bucketFileId ? { fileId: bucketFileId } : {}),
		};

		if (draftData.draftId) {
			try {
				return await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.licenseDraftsCollectionId,
					rowId: draftData.draftId,
					data: draftPayload,
				});
			} catch (error: unknown) {
				const code =
					typeof error === "object" && error && "code" in error
						? (error as { code?: number }).code
						: undefined;
				const message =
					error instanceof Error ? error.message : String(error ?? "");
				const missing =
					code === 404 ||
					/could not be found|not found/i.test(message);

				if (!missing) throw error;

				// Stale draftId (deleted or expired) — create a fresh draft
				return await tablesDB.createRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.licenseDraftsCollectionId,
					rowId: ID.unique(),
					data: draftPayload,
				});
			}
		}

		return await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.licenseDraftsCollectionId,
			rowId: ID.unique(),
			data: draftPayload,
		});
	}

	/**
	 * Get drafts for owner
	 */
	static async getDrafts(ownerId: string) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.licenseDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		const drafts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.licenseDraftsCollectionId,
			queries: [
				Query.equal("ownerId", ownerId),
				Query.equal("isCompleted", false),
				Query.orderDesc("lastSavedAt"),
				Query.limit(100),
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

		// Parse JSON fields safely (Tables API may nest columns under `data`)
		return drafts.rows.map((raw: any) => {
			const draft =
				raw?.data && typeof raw.data === "object"
					? { ...raw, ...raw.data }
					: raw;

			let formData = null;
			let processedFileData = null;
			let extractedData = null;

			try {
				formData = draft.formData
					? typeof draft.formData === "string"
						? JSON.parse(draft.formData)
						: draft.formData
					: null;
			} catch (e) {
				console.warn("Failed to parse formData for draft:", draft.$id, e);
			}

			try {
				processedFileData = draft.processedFileData
					? typeof draft.processedFileData === "string"
						? JSON.parse(draft.processedFileData)
						: draft.processedFileData
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
					? typeof draft.extractedData === "string"
						? JSON.parse(draft.extractedData)
						: draft.extractedData
					: null;
			} catch (e) {
				console.warn("Failed to parse extractedData for draft:", draft.$id, e);
			}

			return {
				$id: draft.$id,
				ownerId: draft.ownerId,
				accountId: draft.accountId,
				formData,
				currentStep: Number(draft.currentStep) || 1,
				progressPercentage: Number(draft.progressPercentage) || 0,
				lastSavedAt: draft.lastSavedAt,
				isCompleted: draft.isCompleted,
				processedFileData,
				extractedData,
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
			!appwriteConfig.licenseDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		return await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.licenseDraftsCollectionId,
			rowId: draftId,
		});
	}

	/**
	 * Delete draft
	 */
	static async deleteDraft(draftId: string, ownerId?: string) {
		const { tablesDB } = await createAdminClient();

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.licenseDraftsCollectionId
		) {
			throw new Error("Database configuration missing");
		}

		// Verify ownership if ownerId provided
		if (ownerId) {
			const draft = await LicenseDraftService.getDraftById(draftId);
			if (draft.ownerId !== ownerId) {
				throw new Error("Unauthorized: Draft does not belong to user");
			}
		}

		await tablesDB.deleteRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.licenseDraftsCollectionId,
			rowId: draftId,
		});

		return { draftId };
	}
}

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const body = await request.json();
		const {
			ownerId,
			accountId,
			formData,
			currentStep,
			processedFileData,
			extractedData,
			draftId,
		} = body;

		// Authentication
		const authError = await requireAuth(request);
		if (authError) return authError;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse("User not found", 401, { requestId });
		}

		// Verify owner matches authenticated user
		if (ownerId !== user.$id) {
			return errorResponse("Unauthorized: Owner ID does not match user", 403, {
				requestId,
			});
		}

		if (!ownerId || !accountId) {
			return validationErrorResponse(
				"Owner ID and Account ID are required",
				requestId,
			);
		}

		// Use LicenseDraftService to save draft
		const draft = await LicenseDraftService.saveDraft(ownerId, accountId, {
			draftId,
			formData,
			currentStep,
			processedFileData,
			extractedData,
			isCompleted: false,
			totalSteps: 2, // License upload has 2 steps
		});

		return successResponse(
			{
				draft,
			},
			{ requestId, message: "Draft saved successfully" },
		);
	} catch (error: any) {
		console.error("Error saving draft:", {
			requestId,
			message: error?.message,
			code: error?.code,
			type: error?.type,
			response: error?.response,
			stack: error?.stack,
			name: error?.name,
			fullError: error,
		});

		return errorResponse(
			error instanceof Error ? error : new Error("Failed to save draft"),
			500,
			{
				requestId,
				details:
					process.env.NODE_ENV === "development"
						? {
								code: error?.code,
								type: error?.type,
							}
						: undefined,
			},
		);
	}
}

export async function GET(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const { searchParams } = new URL(request.url);
		const ownerId = searchParams.get("ownerId");

		if (!ownerId) {
			return validationErrorResponse(
				"ownerId query parameter is required",
				requestId,
			);
		}

		// Authentication
		const authError = await requireAuth(request);
		if (authError) return authError;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse("User not found", 401, { requestId });
		}

		// Verify owner matches authenticated user
		if (ownerId !== user.$id) {
			return errorResponse("Unauthorized: Owner ID does not match user", 403, {
				requestId,
			});
		}

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.licenseDraftsCollectionId
		) {
			return errorResponse(new Error("Database configuration missing"), 500, {
				requestId,
			});
		}

		// Get drafts
		const drafts = await LicenseDraftService.getDrafts(ownerId);

		return successResponse({ drafts }, { requestId });
	} catch (error: any) {
		console.error("Error fetching drafts:", {
			message: error?.message,
			stack: error?.stack,
			name: error?.name,
			requestId,
		});
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch drafts"),
			500,
			{
				requestId,
				details:
					process.env.NODE_ENV === "development"
						? {
								message: error?.message,
								stack: error?.stack,
							}
						: undefined,
			},
		);
	}
}

export async function DELETE(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		const { searchParams } = new URL(request.url);
		const draftId = searchParams.get("draftId");
		const ownerId = searchParams.get("ownerId");

		if (!draftId) {
			return validationErrorResponse("draftId is required", requestId);
		}

		// Authentication
		const authError = await requireAuth(request);
		if (authError) return authError;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse("User not found", 401, { requestId });
		}

		// Get draft to verify owner access
		let draftOwnerId: string | null = ownerId || null;
		try {
			const draft = await LicenseDraftService.getDraftById(draftId);
			draftOwnerId = draft.ownerId as string;

			// Verify owner matches authenticated user
			if (draftOwnerId !== user.$id) {
				return errorResponse(
					"Unauthorized: Draft does not belong to user",
					403,
					{ requestId },
				);
			}
		} catch (error) {
			console.warn("Could not fetch draft:", error);
		}

		// Use LicenseDraftService to delete draft
		const deleted = await LicenseDraftService.deleteDraft(
			draftId,
			draftOwnerId || undefined,
		);

		return successResponse(
			{
				deleted: {
					draft: deleted.draftId,
				},
			},
			{ requestId, message: "Draft deleted successfully" },
		);
	} catch (error: any) {
		console.error("Error deleting draft:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to delete draft"),
			500,
			{ requestId },
		);
	}
}
