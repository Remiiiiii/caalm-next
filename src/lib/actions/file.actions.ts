"use server";

import { revalidatePath } from "next/cache";
import { ID, type Models, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import {
	getFileShareNotificationTitle,
	getFileShareViewActionText,
} from "@/lib/files/fileShareNotification";
import { constructFileUrl, getFileType, parseStringify } from "@/lib/utils";
import {
	triggerContractExpiryNotification,
	triggerContractRenewalNotification,
	triggerFileUploadNotification,
} from "@/lib/utils/notificationTriggers";
import type { ContractMetadataPayload } from "@/types/contracts";
import type { LicenseMetadataPayload } from "@/types/licenses";
import {
	createContractActivity,
	createFileActivity,
} from "./recentActivity.actions";
import { getCurrentUser, getUserByEmail, getUserById } from "./user.actions";

const handleError = (error: unknown, message: string) => {
	console.log(error, message);
	throw error;
};

const sanitizePayload = <T extends Record<string, unknown>>(payload: T) =>
	Object.fromEntries(
		Object.entries(payload).filter(([_, value]) => {
			if (Array.isArray(value)) {
				return value.length > 0;
			}
			return value !== undefined && value !== null && value !== "";
		}),
	);

/** Appwrite string attributes reject oversize / non-string values. */
const clampAppwriteString = (
	value: unknown,
	maxChars: number,
): string | undefined => {
	if (value === undefined || value === null) return undefined;
	const str = String(value).trim();
	if (!str) return undefined;
	return str.length > maxChars ? str.slice(0, maxChars) : str;
};

const clampAppwriteStringArray = (
	value: unknown,
	maxChars: number,
): string[] | undefined => {
	if (!Array.isArray(value) || value.length === 0) return undefined;
	const clamped = value
		.map((item) => clampAppwriteString(item, maxChars))
		.filter((item): item is string => Boolean(item));
	return clamped.length > 0 ? clamped : undefined;
};

/**
 * Contracts collection string sizes (TablesDB). Keep in sync with Appwrite.
 * Free-text / AI-filled fields target 1000; IDs and codes stay smaller.
 */
const CONTRACT_STRING_LIMITS = {
	contractName: 255,
	contractNumber: 50,
	vendor: 1000,
	description: 1000,
	departmentOwner: 128,
	businessUnit: 128,
	subDepartment: 128,
	budgetCode: 255,
	costCenter: 255,
	dataPrivacyRequirements: 1000,
	regulatoryRequirements: 500,
	counterpartyLegalName: 1000,
	counterpartyContactPhone: 100,
	counterpartyAddress: 1000,
	counterpartyTaxId: 100,
	counterpartyDunsNumber: 100,
	keyObligations: 1000,
	serviceLevelAgreements: 500,
	performanceMetrics: 500,
	reportingRequirements: 500,
	postTerminationObligations: 500,
	attachmentReferences: 1000,
	relatedDocumentIds: 64,
	versionNumber: 50,
	parentContractId: 64,
	templateUsed: 255,
	internalApproverIds: 64,
	assignedManagers: 64,
	currentApprovalStage: 255,
	approvalHistoryLog: 500,
	approvalWorkflowState: 16384,
	reviewerComments: 1000,
	orgId: 64,
	contractOwnerId: 64,
	fileId: 100,
} as const;

const mapRiskToPriority = (risk?: string) => {
	if (!risk) return "Medium";
	switch (risk) {
		case "critical":
			return "Urgent";
		case "high":
			return "High";
		case "low":
			return "Low";
		default:
			return "Medium";
	}
};

const mapRiskToCompliance = (risk?: string) => {
	if (!risk) return "action-required";
	switch (risk) {
		case "critical":
			return "non-compliant";
		case "high":
			return "action-required";
		case "low":
			return "up-to-date";
		default:
			return "action-required";
	}
};

export const uploadFile = async ({
	file,
	ownerId,
	accountId,
	path: revalidatePathArg,
	contractMetadata,
	licenseMetadata,
	draftId,
}: UploadFileProps & {
	contractMetadata?: ContractMetadataPayload;
	licenseMetadata?: LicenseMetadataPayload;
	draftId?: string; // Optional draft ID to link the contract to the draft
}) => {
	const { storage, tablesDB } = await createAdminClient();

	try {
		// Get user's organization
		const defaultOrg = await getUserDefaultOrganization(ownerId);
		if (!defaultOrg) {
			throw new Error("User organization not found");
		}

		// Validate required config
		if (
			!appwriteConfig.bucketId ||
			!appwriteConfig.databaseId ||
			!appwriteConfig.filesCollectionId
		) {
			throw new Error("Appwrite configuration is missing required fields");
		}

		// Convert File to ArrayBuffer for InputFile.fromBuffer
		const arrayBuffer = await file.arrayBuffer();
		const inputFile = InputFile.fromBuffer(Buffer.from(arrayBuffer), file.name);

		console.log("Uploading file to Appwrite storage:", {
			fileName: file.name,
			fileSize: file.size,
			fileType: file.type,
			bucketId: appwriteConfig.bucketId,
		});

		// ✅ CORRECT - Use positional parameters, not object syntax
		const bucketFile = await storage.createFile(
			appwriteConfig.bucketId!, // First parameter: bucketId
			ID.unique(), // Second parameter: fileId
			inputFile, // Third parameter: file (InputFile)
		);

		console.log("File uploaded to storage successfully:", {
			bucketFileId: bucketFile.$id,
			bucketFileName: bucketFile.name,
			bucketFileSize: bucketFile.sizeOriginal,
			bucketFileMimeType: bucketFile.mimeType,
		});

		const fileDocument = {
			type: getFileType(bucketFile.name).type,
			name: bucketFile.name,
			url: constructFileUrl(bucketFile.$id),
			extension: getFileType(bucketFile.name).extension,
			size: bucketFile.sizeOriginal,
			owner: ownerId,
			accountId,
			users: [],
			bucketFileId: bucketFile.$id,
			orgId: defaultOrg.orgId,
		};

		const newFile = await tablesDB
			.createRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.filesCollectionId!,
				rowId: ID.unique(),
				data: fileDocument,
			})
			.catch(async (error: unknown) => {
				await storage.deleteFile({
					bucketId: appwriteConfig.bucketId!,
					fileId: bucketFile.$id,
				});
				handleError(error, "Failed to create file document");
			});

		if (!newFile) {
			throw new Error("File document creation failed");
		}

		const metadata = contractMetadata;
		// Check if filename contains "contract" (case-insensitive) or if contractMetadata is provided
		if (bucketFile.name.toLowerCase().includes("contract") || metadata) {
			// Add to Contracts collection as well
			// All contracts default to 'pending-review' status and require review before activation
			let contractExpiryDate: string | undefined;
			let status = "pending-review";

			if (metadata?.contractExpiryDate) {
				// Normalize the date to prevent timezone shifts
				// If it's already in YYYY-MM-DD format, convert to ISO with noon UTC
				const dateStr = metadata.contractExpiryDate;
				const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
				if (dateOnlyMatch) {
					// Extract date components and create date at noon UTC to avoid timezone shifts
					const [, year, month, day] = dateOnlyMatch;
					const dateAtNoonUTC = new Date(
						Date.UTC(
							parseInt(year, 10),
							parseInt(month, 10) - 1, // Month is 0-indexed
							parseInt(day, 10),
							12, // Noon UTC
							0,
							0,
							0,
						),
					);
					contractExpiryDate = dateAtNoonUTC.toISOString();
				} else {
					// If it's already an ISO string, use it as-is
					contractExpiryDate = dateStr;
				}
				// Keep status as 'pending-review' - contracts must be reviewed before activation
				// Only set to 'action-required' if explicitly terminated
				if (metadata.lifecycleStatus === "terminated") {
					status = "action-required";
				}
				// Otherwise, keep 'pending-review' (default)
			} else {
				// Fallback to extraction for files with "contract" in name
				try {
					const formData = new FormData();
					const fileForFormData = new File([arrayBuffer], bucketFile.name, {
						type: file.type,
					});
					formData.append("file", fileForFormData);
					const response = await fetch(
						"http://localhost:3000/api/extract-expiry",
						{
							method: "POST",
							body: formData,
						},
					);
					const data = await response.json();
					contractExpiryDate = data.expiryDate;
					if (!contractExpiryDate) {
						contractExpiryDate = new Date().toISOString().split("T")[0];
						// Keep as 'pending-review' - missing expiry date doesn't change review requirement
						// Status will remain 'pending-review' until reviewed
					}
				} catch (error) {
					console.error("Error extracting contract expiry date:", error);
					contractExpiryDate = new Date().toISOString().split("T")[0];
					// Keep as 'pending-review' - error extracting doesn't change review requirement
				}
			}

			const defaultOrg = await getUserDefaultOrganization(ownerId);
			const resolvedOrgId = metadata?.orgId || defaultOrg?.orgId;

			if (!resolvedOrgId) {
				throw new Error(
					"Unable to determine the organization for this contract upload.",
				);
			}

			const assignedManagerIds = metadata?.assignedManagers || [];
			const assignedManagers = await (async () => {
				const managerIds = assignedManagerIds;
				if (managerIds.length === 0) return [];

				const managerNames: string[] = [];
				for (const managerId of managerIds) {
					try {
						const user = await getUserById(managerId);
						if (user?.fullName) {
							managerNames.push(user.fullName);
						} else {
							managerNames.push(managerId);
						}
					} catch (error) {
						console.error(`Failed to fetch manager ${managerId}:`, error);
						managerNames.push(managerId);
					}
				}
				return managerNames;
			})();

			// Build contract document, explicitly excluding contractId (not in Contracts collection schema)
			const contractDocumentRaw: any = {
				contractName: clampAppwriteString(
					metadata?.contractName || bucketFile.name,
					CONTRACT_STRING_LIMITS.contractName,
				),
				contractExpiryDate,
				status,
				startDate: metadata?.startDate,
				executionDate: metadata?.executionDate,
				autoRenew: metadata?.autoRenew,
				renewalNoticeDays: metadata?.renewalNoticeDays,
				amount: metadata?.amount,
				currencyCode: metadata?.currencyCode || "USD",
				notToExceedAmount: metadata?.notToExceedAmount,
				paymentTerms: metadata?.paymentTerms,
				paymentSchedule: metadata?.paymentSchedule,
				budgetCode: clampAppwriteString(
					metadata?.budgetCode,
					CONTRACT_STRING_LIMITS.budgetCode,
				),
				costCenter: clampAppwriteString(
					metadata?.costCenter,
					CONTRACT_STRING_LIMITS.costCenter,
				),
				daysUntilExpiry: (() => {
					if (contractExpiryDate) {
						try {
							// Parse date-only strings (YYYY-MM-DD) using local timezone to avoid timezone issues
							const expiryStr = contractExpiryDate.split("T")[0];
							const [year, month, day] = expiryStr.split("-").map(Number);
							const expiryDate = new Date(year, month - 1, day);
							expiryDate.setHours(0, 0, 0, 0);

							const today = new Date();
							today.setHours(0, 0, 0, 0);

							const timeDiff = expiryDate.getTime() - today.getTime();
							return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
						} catch (error) {
							console.error("Error calculating days until expiry:", error);
							return undefined;
						}
					}
					return undefined;
				})(),
				compliance:
					metadata?.compliance ?? mapRiskToCompliance(metadata?.riskLevel),
				assignedManagers: clampAppwriteStringArray(
					assignedManagers,
					CONTRACT_STRING_LIMITS.assignedManagers,
				),
				department: metadata?.assignToDepartment,
				businessUnit: clampAppwriteString(
					metadata?.businessUnit,
					CONTRACT_STRING_LIMITS.businessUnit,
				),
				subDepartment: clampAppwriteString(
					metadata?.subDepartment,
					CONTRACT_STRING_LIMITS.subDepartment,
				),
				departmentOwner: clampAppwriteString(
					metadata?.departmentOwner,
					CONTRACT_STRING_LIMITS.departmentOwner,
				),
				contractType: (() => {
					const contractType = metadata?.contractType;
					if (typeof contractType === "string") {
						const typeMapping: Record<string, string> = {
							"Service Agreement": "Service_Agreement",
							"Professional Services": "Consulting_Agreement",
							"Purchase Agreement": "Purchase_Order",
							"Purchase Order": "Purchase_Order",
							"License Agreement": "License_Agreement",
							"Confidentiality/NDA": "NDA_",
							NDA: "NDA_",
							"Employment Contract": "Employment_Contract",
							"Vendor Contract": "Vendor_Contract",
							"Lease Agreement": "Lease_Agreement",
							"Consulting Agreement": "Consulting_Agreement",
							"Statement of Work (SOW)": "Consulting_Agreement",
							"Statement of Work": "Consulting_Agreement",
							"Master Agreement": "Service_Agreement",
							"Government Grant": "Government_Grant",
							"Government Contract": "Government_Contract",
							"Grant Agreement": "Grant_Agreement",
							"Vendor/Service Agreement": "Vendor_Service_Agreement",
							"Memorandum of Understanding": "MOU",
							"Donation/Gift Agreement": "Donation_Agreement",
							"Independent Contractor Agreement": "Independent_Contractor",
							"Fiscal Sponsorship Agreement": "Fiscal_Sponsorship",
							Amendment: "Other",
							Other: "Other",
						};
						return typeMapping[contractType] || "Other";
					}
					return "Other";
				})(),
				contractCategory: metadata?.contractCategory,
				vendor: clampAppwriteString(
					metadata?.vendor ?? metadata?.counterpartyLegalName,
					CONTRACT_STRING_LIMITS.vendor,
				),
				contractNumber: clampAppwriteString(
					metadata?.contractNumber,
					CONTRACT_STRING_LIMITS.contractNumber,
				),
				priority: metadata?.priority ?? mapRiskToPriority(metadata?.riskLevel),
				description: clampAppwriteString(
					metadata?.description,
					CONTRACT_STRING_LIMITS.description,
				),
				// Always set contractOwnerId to the user who uploaded the contract
				contractOwnerId: clampAppwriteString(
					ownerId,
					CONTRACT_STRING_LIMITS.contractOwnerId,
				),
				lifecycleStatus: metadata?.lifecycleStatus || "draft",
				riskLevel: metadata?.riskLevel,
				insuranceRequired: metadata?.insuranceRequired,
				insuranceVerifiedDate: metadata?.insuranceVerifiedDate,
				insuranceExpiryDate: metadata?.insuranceExpiryDate,
				indemnificationIncluded: metadata?.indemnificationIncluded,
				hipaaRequired: metadata?.hipaaRequired,
				dataPrivacyRequirements: clampAppwriteString(
					metadata?.dataPrivacyRequirements,
					CONTRACT_STRING_LIMITS.dataPrivacyRequirements,
				),
				backgroundCheckRequired: metadata?.backgroundCheckRequired,
				regulatoryRequirements: clampAppwriteString(
					metadata?.regulatoryRequirements,
					CONTRACT_STRING_LIMITS.regulatoryRequirements,
				),
				auditRightsGranted: metadata?.auditRightsGranted,
				counterpartyLegalName: clampAppwriteString(
					metadata?.counterpartyLegalName,
					CONTRACT_STRING_LIMITS.counterpartyLegalName,
				),
				counterpartyContactEmail: metadata?.counterpartyContactEmail,
				counterpartyContactPhone: clampAppwriteString(
					metadata?.counterpartyContactPhone,
					CONTRACT_STRING_LIMITS.counterpartyContactPhone,
				),
				counterpartyAddress: clampAppwriteString(
					metadata?.counterpartyAddress,
					CONTRACT_STRING_LIMITS.counterpartyAddress,
				),
				counterpartyType: metadata?.counterpartyType,
				counterpartyTaxId: clampAppwriteString(
					metadata?.counterpartyTaxId,
					CONTRACT_STRING_LIMITS.counterpartyTaxId,
				),
				counterpartyDunsNumber: clampAppwriteString(
					metadata?.counterpartyDunsNumber,
					CONTRACT_STRING_LIMITS.counterpartyDunsNumber,
				),
				keyObligations: clampAppwriteStringArray(
					metadata?.keyObligations,
					CONTRACT_STRING_LIMITS.keyObligations,
				),
				serviceLevelAgreements: clampAppwriteString(
					metadata?.serviceLevelAgreements,
					CONTRACT_STRING_LIMITS.serviceLevelAgreements,
				),
				performanceMetrics: clampAppwriteString(
					metadata?.performanceMetrics,
					CONTRACT_STRING_LIMITS.performanceMetrics,
				),
				reportingRequirements: clampAppwriteString(
					metadata?.reportingRequirements,
					CONTRACT_STRING_LIMITS.reportingRequirements,
				),
				postTerminationObligations: clampAppwriteString(
					metadata?.postTerminationObligations,
					CONTRACT_STRING_LIMITS.postTerminationObligations,
				),
				terminationNoticeDays: metadata?.terminationNoticeDays,
				terminationRights: metadata?.terminationRights,
				curePeriodDays: metadata?.curePeriodDays,
				attachmentReferences: clampAppwriteStringArray(
					metadata?.attachmentReferences,
					CONTRACT_STRING_LIMITS.attachmentReferences,
				),
				relatedDocumentIds: clampAppwriteStringArray(
					metadata?.relatedDocumentIds,
					CONTRACT_STRING_LIMITS.relatedDocumentIds,
				),
				versionNumber: clampAppwriteString(
					metadata?.versionNumber,
					CONTRACT_STRING_LIMITS.versionNumber,
				),
				parentContractId: clampAppwriteString(
					metadata?.parentContractId,
					CONTRACT_STRING_LIMITS.parentContractId,
				),
				templateUsed: clampAppwriteString(
					metadata?.templateUsed,
					CONTRACT_STRING_LIMITS.templateUsed,
				),
				approvalWorkflowTemplate: metadata?.approvalWorkflowTemplate,
				internalApproverIds: clampAppwriteStringArray(
					metadata?.internalApproverIds,
					CONTRACT_STRING_LIMITS.internalApproverIds,
				),
				currentApprovalStage: clampAppwriteString(
					metadata?.currentApprovalStage,
					CONTRACT_STRING_LIMITS.currentApprovalStage,
				),
				approvalHistoryLog: clampAppwriteString(
					metadata?.approvalHistoryLog,
					CONTRACT_STRING_LIMITS.approvalHistoryLog,
				),
				reviewerComments: clampAppwriteString(
					metadata?.reviewerComments,
					CONTRACT_STRING_LIMITS.reviewerComments,
				),
				fileId: clampAppwriteString(
					newFile.$id,
					CONTRACT_STRING_LIMITS.fileId,
				),
				// fileRef is a relationship attribute - Appwrite will handle it automatically
				// Setting it as a string causes validation errors
				orgId: clampAppwriteString(
					resolvedOrgId,
					CONTRACT_STRING_LIMITS.orgId,
				),
			};

			// Explicitly remove contractId if it exists (not in Contracts collection schema)
			delete contractDocumentRaw.contractId;

			// Remove contractCategory if it exists (not in Contracts collection schema)
			delete contractDocumentRaw.contractCategory;

			// Remove contractOwnerName if it exists (not in Contracts collection schema)
			// contractOwnerName belongs in enterpriseMetadata collection, not Contracts collection
			delete contractDocumentRaw.contractOwnerName;

			// Also remove enterpriseMetadata if it was accidentally spread (should be nested)
			delete contractDocumentRaw.enterpriseMetadata;

			const contractDocument = sanitizePayload(contractDocumentRaw);

			// Final safety check: ensure contractOwnerName is not in the sanitized document
			if ("contractOwnerName" in contractDocument) {
				delete (contractDocument as any).contractOwnerName;
			}

			if (!appwriteConfig.contractsCollectionId) {
				throw new Error("Contracts collection ID is not configured");
			}

			const contract = await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId,
				rowId: ID.unique(),
				data: contractDocument,
			});

			// Initialize multi-step approval workflow (pending-review → exec → active)
			try {
				const { initializeOnUpload } = await import(
					"@/lib/approvals/ContractApprovalWorkflowService"
				);
				await initializeOnUpload({
					contractId: contract.$id,
					departmentManagerIds: assignedManagerIds,
				});
			} catch (workflowError) {
				console.error(
					"Failed to initialize contract approval workflow:",
					workflowError,
				);
			}

			// Update drafts with the new fileId (from the file row created during upload)
			// This ensures drafts can be found by fileId for deletion
			if (appwriteConfig.contractDraftsCollectionId && newFile.$id) {
				try {
					// Find drafts that might have a placeholder file row (by filename matching)
					// and update their fileId to point to the new file row
					const draftsToUpdate = await tablesDB.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractDraftsCollectionId,
						queries: [
							Query.equal("ownerId", ownerId),
							Query.equal("isCompleted", false),
							Query.contains("processedFileData", newFile.name),
						],
					});

					// Update drafts that match the filename and don't have a fileId or have a different fileId
					for (const draft of draftsToUpdate.rows) {
						try {
							const processedData = draft.processedFileData
								? JSON.parse(draft.processedFileData)
								: null;

							// Match by exact filename
							if (processedData?.name === newFile.name) {
								// Update draft's fileId to point to the new file row
								await tablesDB.updateRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.contractDraftsCollectionId,
									rowId: draft.$id,
									data: {
										fileId: newFile.$id,
									},
								});
								console.log(
									`Updated draft ${draft.$id} fileId to ${newFile.$id}`,
								);
							}
						} catch (error) {
							console.warn(`Error updating draft ${draft.$id} fileId:`, error);
						}
					}
				} catch (updateError: any) {
					console.warn(
						"Error updating drafts with new fileId:",
						updateError.message,
					);
					// Continue with deletion even if update fails
				}
			}

			// Automatically delete drafts associated with this contract
			// Uses fileId matching (primary) and filename matching (fallback)
			if (appwriteConfig.contractDraftsCollectionId && newFile.$id) {
				try {
					// Primary method: Find drafts by fileId attribute (most efficient - direct query)
					// This is the most reliable method since fileId is unique per file row
					const draftsByFileId = await tablesDB.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractDraftsCollectionId,
						queries: [
							Query.equal("ownerId", ownerId),
							Query.equal("fileId", newFile.$id),
							Query.equal("isCompleted", false), // Only match incomplete drafts
						],
					});

					// Safety check: Filter out drafts that already have a contractId
					// (shouldn't happen with fileId matching, but safety first)
					const validDraftsByFileId = draftsByFileId.rows.filter(
						(draft: any) => {
							if (draft.contractId) {
								console.warn(
									`Skipping draft ${draft.$id} - already linked to contract ${draft.contractId} (fileId match)`,
								);
								return false;
							}
							return true;
						},
					);

					// Fallback method 1: Find drafts by contractId (if draft was already linked)
					let draftsToDelete = validDraftsByFileId;
					if (draftsToDelete.length === 0) {
						const draftsByContractId = await tablesDB.listRows({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.contractDraftsCollectionId,
							queries: [
								Query.equal("ownerId", ownerId),
								Query.equal("contractId", contract.$id),
								Query.equal("isCompleted", false),
							],
						});
						draftsToDelete = draftsByContractId.rows;
						console.log(
							`Found ${draftsToDelete.length} draft(s) by contractId: ${contract.$id}`,
						);
					}

					// Fallback method 2: Find drafts by filename if no drafts found by fileId or contractId
					// Use strict matching to avoid deleting drafts from previous uploads with same filename
					if (draftsToDelete.length === 0) {
						const draftsByFilename = await tablesDB.listRows({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.contractDraftsCollectionId,
							queries: [
								Query.equal("ownerId", ownerId),
								Query.equal("isCompleted", false), // Only match incomplete drafts
								Query.contains("processedFileData", newFile.name),
							],
						});

						// Filter by exact filename match AND additional safety checks
						const matchingDrafts = draftsByFilename.rows.filter(
							(draft: any) => {
								try {
									const processedData = draft.processedFileData
										? JSON.parse(draft.processedFileData)
										: null;

									// Must have exact filename match
									if (processedData?.name !== newFile.name) {
										return false;
									}

									// Safety check: Draft must not already have a contractId
									// (indicates it's linked to a different contract)
									if (draft.contractId) {
										console.warn(
											`Skipping draft ${draft.$id} - already linked to contract ${draft.contractId}`,
										);
										return false;
									}

									// Additional safety: Match by file size if available
									// This ensures we're matching the same file, not just same filename
									// Compare with both newFile.size (from Files table) and bucketFile.sizeOriginal (from storage)
									const newFileSize = newFile.size || bucketFile.sizeOriginal;
									if (
										processedData?.size &&
										newFileSize &&
										processedData.size !== newFileSize
									) {
										console.warn(
											`Skipping draft ${draft.$id} - file size mismatch (draft: ${processedData.size}, new: ${newFileSize})`,
										);
										return false;
									}

									// Additional safety: Match by bucketFileId if available
									// This is the most reliable identifier for the same file
									if (
										processedData?.bucketFileId &&
										bucketFile.$id &&
										processedData.bucketFileId !== bucketFile.$id
									) {
										console.warn(
											`Skipping draft ${draft.$id} - bucketFileId mismatch (draft: ${processedData.bucketFileId}, new: ${bucketFile.$id})`,
										);
										return false;
									}

									return true;
								} catch (error) {
									console.warn(
										`Error parsing processedFileData for draft ${draft.$id}:`,
										error,
									);
									return false;
								}
							},
						);

						// If multiple drafts match, prioritize the most recent one
						// This handles the edge case where a user uploads the same filename multiple times
						if (matchingDrafts.length > 1) {
							// Sort by lastSavedAt (most recent first) and only delete the most recent
							matchingDrafts.sort((a: any, b: any) => {
								const dateA = new Date(
									a.lastSavedAt || a.$createdAt || 0,
								).getTime();
								const dateB = new Date(
									b.lastSavedAt || b.$createdAt || 0,
								).getTime();
								return dateB - dateA; // Descending order (newest first)
							});

							// Only delete the most recent matching draft
							// Log a warning about other matching drafts
							console.warn(
								`Found ${matchingDrafts.length} matching drafts for filename "${
									newFile.name
								}". Only deleting the most recent draft (${
									matchingDrafts[0].$id
								}). Other drafts: ${matchingDrafts
									.slice(1)
									.map((d: any) => d.$id)
									.join(", ")}`,
							);
							draftsToDelete = [matchingDrafts[0]];
						} else {
							draftsToDelete = matchingDrafts;
						}

						// Update all matching drafts' fileId to point to the new file row
						// This ensures future queries work correctly
						for (const draft of draftsToDelete) {
							try {
								await tablesDB.updateRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.contractDraftsCollectionId,
									rowId: draft.$id,
									data: {
										fileId: newFile.$id,
									},
								});
								console.log(
									`Updated draft ${draft.$id} fileId to ${newFile.$id} (filename match)`,
								);
							} catch (updateError: any) {
								console.warn(
									`Failed to update draft ${draft.$id} fileId:`,
									updateError.message,
								);
								// Continue with deletion even if update fails
							}
						}
					}

					// Update drafts with contractId before deletion (as backup for future queries)
					// This helps if deletion fails or for audit purposes
					for (const draft of draftsToDelete) {
						try {
							// First, update draft with contractId (backup method for identification)
							await tablesDB.updateRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.contractDraftsCollectionId,
								rowId: draft.$id,
								data: {
									contractId: contract.$id,
								},
							});
							console.log(
								`Updated draft ${draft.$id} with contractId ${contract.$id}`,
							);
						} catch (updateError: any) {
							console.warn(
								`Failed to update draft ${draft.$id} with contractId:`,
								updateError.message,
							);
							// Continue with deletion even if update fails
						}

						// Then delete the draft
						try {
							await tablesDB.deleteRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.contractDraftsCollectionId,
								rowId: draft.$id,
							});
							console.log(
								`Deleted draft ${draft.$id} after successful contract upload (contract: ${contract.$id})`,
							);
						} catch (deleteError: any) {
							console.warn(
								`Failed to delete draft ${draft.$id}:`,
								deleteError.message,
							);
							// Continue with other deletions
						}
					}

					// Also handle explicit draftId if provided (for backward compatibility)
					if (draftId && !draftsToDelete.find((d: any) => d.$id === draftId)) {
						try {
							// Update with contractId first
							await tablesDB.updateRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.contractDraftsCollectionId,
								rowId: draftId,
								data: {
									contractId: contract.$id,
								},
							});

							// Then delete
							await tablesDB.deleteRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.contractDraftsCollectionId,
								rowId: draftId,
							});
							console.log(
								`Deleted draft ${draftId} after successful contract upload (contract: ${contract.$id})`,
							);
							draftsToDelete.push({ $id: draftId } as any);
						} catch (error: any) {
							console.warn(`Failed to delete draft ${draftId}:`, error.message);
						}
					}

					// Invalidate cache for drafts after deletion
					if (draftsToDelete.length > 0) {
						try {
							await CacheManager.invalidate(
								CACHE_KEYS.contracts.drafts(ownerId),
							);
							console.log("Invalidated drafts cache after deletion");
						} catch (cacheError) {
							console.warn("Failed to invalidate drafts cache:", cacheError);
						}
					}
				} catch (draftDeletionError: any) {
					// Log but don't fail - contract is already created successfully
					console.warn(
						"Error during automatic draft deletion:",
						draftDeletionError.message,
					);
				}
			}

			const enterprisePayload = metadata?.enterpriseMetadata
				? sanitizePayload({
						contractId: contract.$id, // Required attribute
						orgId: resolvedOrgId,
						// Exclude fields that are not in the collection schema
						// Include other enterprise metadata fields
						...Object.fromEntries(
							Object.entries(metadata.enterpriseMetadata).filter(
								([key]) =>
									key !== "digitalSignatureRequired" && key !== "accessScope",
								// contractId is required, so we set it explicitly above
							),
						),
					})
				: null;

			if (enterprisePayload && Object.keys(enterprisePayload).length > 2) {
				await tablesDB.createRow({
					databaseId: appwriteConfig.databaseId!,
					tableId:
						appwriteConfig.contractsEnterpriseMetadataCollectionId ||
						appwriteConfig.contractExtensionsCollectionId ||
						"contractsEnterpriseMetadata",
					rowId: ID.unique(),
					data: enterprisePayload,
				});
			}

			// Save contract metadata in the file document for easy access
			// Note: Only include attributes that exist in the files collection schema
			// contractId may not exist in the new Files collection schema, so we conditionally include it
			const fileUpdateDataRaw: any = {
				contractExpiryDate,
				status,
				contractName: contractDocument.contractName,
				contractType: contractDocument.contractType,
				amount: contractDocument.amount,
				vendor: contractDocument.vendor,
				contractNumber: contractDocument.contractNumber,
				priority: contractDocument.priority,
				compliance: contractDocument.compliance,
				department: contractDocument.department,
				assignedManagers: contractDocument.assignedManagers,
				// Excluded: riskLevel, contractCategory, currencyCode (not in files collection schema)
				// contractId: Only include if the Files collection has this attribute
				// For now, we'll try to include it and let Appwrite reject it if it doesn't exist
				// This allows the code to work with both old and new Files collections
			};

			// Try to include contractId - if the collection doesn't have it, Appwrite will reject it
			// and we'll catch the error and retry without it
			try {
				fileUpdateDataRaw.contractId = contract.$id;
			} catch (_error) {
				// Ignore - contractId might not be in schema
			}

			const fileUpdateData = sanitizePayload(fileUpdateDataRaw);

			console.log("📝 Updating file document with contract metadata:", {
				fileId: newFile.$id,
				updateData: fileUpdateData,
			});

			try {
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					rowId: newFile.$id,
					data: fileUpdateData,
				});
			} catch (updateError: any) {
				// If the error is about unknown attributes (like contractId), try again without it
				if (
					updateError?.message?.includes("Unknown attribute") &&
					fileUpdateData.contractId
				) {
					console.warn(
						"Files collection does not have contractId attribute, retrying without it",
					);
					const fileUpdateDataWithoutContractId = { ...fileUpdateData };
					delete fileUpdateDataWithoutContractId.contractId;
					await tablesDB.updateRow({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.filesCollectionId!,
						rowId: newFile.$id,
						data: fileUpdateDataWithoutContractId,
					});
				} else {
					throw updateError;
				}
			}

			console.log(
				"✅ File document updated successfully with contract metadata",
			);

			// Trigger contract expiry notification if expiry date is set
			if (contractExpiryDate) {
				try {
					const expiryDate = new Date(contractExpiryDate);
					const today = new Date();
					const daysUntilExpiry = Math.ceil(
						(expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
					);

					if (daysUntilExpiry <= 90) {
						// Only notify if within 90 days
						await triggerContractExpiryNotification(
							ownerId,
							bucketFile.name,
							contractExpiryDate,
							daysUntilExpiry,
						);
					}
				} catch (error) {
					console.error(
						"Failed to trigger contract expiry notification:",
						error,
					);
					// Don't throw error here as the contract creation was successful
				}
			}
		}

		// Handle license metadata - create license in licenses collection
		if (licenseMetadata) {
			try {
				const defaultOrg = await getUserDefaultOrganization(ownerId);
				const resolvedOrgId = licenseMetadata.orgId || defaultOrg?.orgId;

				if (!resolvedOrgId) {
					throw new Error(
						"Unable to determine the organization for this license upload.",
					);
				}

				// Convert assignedManagers IDs to names
				const assignedManagers = await (async () => {
					const managerIds = licenseMetadata.assignedManagers || [];
					if (managerIds.length === 0) return [];

					const managerNames: string[] = [];
					for (const managerId of managerIds) {
						try {
							const user = await getUserById(managerId);
							if (user?.fullName) {
								managerNames.push(user.fullName);
							} else {
								managerNames.push(managerId);
							}
						} catch (error) {
							console.error(`Failed to fetch manager ${managerId}:`, error);
							managerNames.push(managerId);
						}
					}
					return managerNames;
				})();

				// Create license using LicenseService.
				// Force pending-review on document upload — extracted/form status
				// must not skip the review → active flow.
				const licenseData = {
					...licenseMetadata,
					status: "pending-review",
					orgId: resolvedOrgId,
					assignedManagers,
					fileId: newFile.$id,
					fileSize:
						(newFile as { size?: number }).size ?? bucketFile.sizeOriginal,
					licenseOwnerId: ownerId,
					createdBy: ownerId,
				};

				const license = await LicenseService.createLicense(
					ownerId,
					licenseData,
				);

				console.log("✅ License created successfully:", license.$id);

				// Initialize multi-step approval workflow (pending-review → exec → active)
				try {
					const { initializeLicenseOnUpload } = await import(
						"@/lib/approvals/LicenseApprovalWorkflowService"
					);
					await initializeLicenseOnUpload({
						licenseId: license.$id,
						departmentManagerIds: licenseMetadata.assignedManagers || [],
					});
				} catch (workflowError) {
					console.error(
						"Failed to initialize license approval workflow:",
						workflowError,
					);
				}

				// Update file document with license reference
				try {
					await tablesDB.updateRow({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.filesCollectionId!,
						rowId: newFile.$id,
						data: {
							licenseId: license.$id,
						},
					});
				} catch (updateError: any) {
					// LicenseId might not be in files collection schema - that's okay
					console.warn(
						"Could not update file with licenseId (attribute may not exist):",
						updateError.message,
					);
				}

				// Delete license draft after successful upload (by draftId or by fileId)
				if (appwriteConfig.licenseDraftsCollectionId) {
					const draftsToDelete: { $id: string }[] = [];
					if (draftId) {
						draftsToDelete.push({ $id: draftId });
					}
					if (draftsToDelete.length === 0) {
						try {
							const byFileId = await tablesDB.listRows({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.licenseDraftsCollectionId!,
								queries: [Query.equal("fileId", newFile.$id), Query.limit(10)],
							});
							draftsToDelete.push(
								...byFileId.rows.map((r: any) => ({ $id: r.$id })),
							);
						} catch (_) {
							// fileId may not exist on drafts
						}
					}
					for (const draft of draftsToDelete) {
						try {
							await tablesDB.deleteRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.licenseDraftsCollectionId!,
								rowId: draft.$id,
							});
							console.log(
								`Deleted license draft ${draft.$id} after successful upload`,
							);
						} catch (delErr: any) {
							console.warn(
								`Failed to delete license draft ${draft.$id}:`,
								delErr?.message,
							);
						}
					}
				}
			} catch (licenseError: any) {
				console.error("Failed to create license:", licenseError);
				// Rethrow so client shows "Upload Failed" and does not clear form or delete draft
				throw licenseError;
			}
		}

		// Create a recent activity for the file upload
		try {
			await createFileActivity(
				"File Uploaded",
				bucketFile.name,
				ownerId,
				"User", // We'll get the actual user name later if needed
			);
		} catch (error) {
			console.error("Failed to create file upload activity:", error);
			// Don't throw error here as the file upload was successful
		}

		// Trigger file upload notification
		try {
			await triggerFileUploadNotification(
				ownerId,
				bucketFile.name,
				getFileType(bucketFile.name).type,
				bucketFile.sizeOriginal,
			);
		} catch (error) {
			console.error("Failed to trigger file upload notification:", error);
			// Don't throw error here as the file upload was successful
		}

		revalidatePath(revalidatePathArg);
		await CacheManager.invalidateStorage();
		return parseStringify(newFile);
	} catch (error) {
		handleError(error, "Failed to upload file");
	}
};

const createQueries = (
	currentUser: Models.Document,
	types: string[],
	searchText: string,
	sort: string,
	limit?: number,
) => {
	// 'owner' is a relationship attribute - query with the ID directly (not in an array)
	const queries = [Query.equal("owner", currentUser.$id)];

	if (types.length > 0) queries.push(Query.equal("type", types));
	if (searchText) queries.push(Query.contains("name", searchText));
	if (limit) queries.push(Query.limit(limit));

	if (sort) {
		const [sortBy, orderBy] = sort.split("-");
		queries.push(
			orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
		);
	}

	return queries;
};

export const getFiles = async ({
	types = [],
	searchText = "",
	sort = "$createdAt-desc",
	limit,
}: GetFilesProps) => {
	const { tablesDB } = await createAdminClient();

	try {
		const currentUser = await getCurrentUser();

		if (!currentUser) {
			console.error("getCurrentUser returned null/undefined in getFiles");
			return { documents: [] };
		}

		const queries = createQueries(currentUser, types, searchText, sort, limit);

		const files = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.filesCollectionId!,
			queries: queries,
		});

		// Defensive: always return a plain object with a documents array
		const plain = parseStringify(files);
		if (!plain || typeof plain !== "object" || !Array.isArray(plain.rows)) {
			return { documents: [] };
		}
		return { documents: plain.rows, total: plain.total };
	} catch (error: any) {
		// Handle case where 'owner' attribute might not be available yet (e.g., still processing)
		if (error?.message?.includes("Attribute not found in schema: owner")) {
			console.warn(
				"Owner attribute not available in collection, fetching all files without owner filter",
			);
			// Fallback: fetch files without owner filter
			try {
				const fallbackQueries: any[] = [];
				if (types.length > 0) fallbackQueries.push(Query.equal("type", types));
				if (searchText)
					fallbackQueries.push(Query.contains("name", searchText));
				if (limit) fallbackQueries.push(Query.limit(limit));
				if (sort) {
					const [sortBy, orderBy] = sort.split("-");
					fallbackQueries.push(
						orderBy === "asc"
							? Query.orderAsc(sortBy)
							: Query.orderDesc(sortBy),
					);
				}

				const files = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					queries: fallbackQueries,
				});

				const plain = parseStringify(files);
				if (!plain || typeof plain !== "object" || !Array.isArray(plain.rows)) {
					return { documents: [] };
				}
				// Filter by owner in memory as fallback
				const user = await getCurrentUser();
				if (user) {
					const filtered = plain.rows.filter((file: any) => {
						const fileOwner =
							typeof file.owner === "string" ? file.owner : file.owner?.$id;
						return fileOwner === user.$id;
					});
					return { documents: filtered, total: filtered.length };
				}
				return { documents: [] };
			} catch (fallbackError) {
				handleError(fallbackError, "Failed to get files (fallback)");
				return { documents: [] };
			}
		}
		handleError(error, "Failed to get files");
		// Defensive: always return a plain object
		return { documents: [] };
	}
};

export const renameFile = async ({
	fileId,
	name,
	extension,
	path,
}: RenameFileProps) => {
	const { tablesDB } = await createAdminClient();

	try {
		const newName = `${name}.${extension}`;
		let contractIdToUpdate: string | null = null;
		let fileIdToUpdate: string | null = null;
		let isContractId = false;
		let updatedDocument: any = null;

		// Try to find document in contracts collection first (contracts are commonly displayed as files)
		try {
			const contractDoc = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: fileId,
			});
			// Found in contracts collection
			isContractId = true;
			contractIdToUpdate = fileId;
			fileIdToUpdate = (contractDoc as any).fileId || null;
		} catch (contractError: any) {
			// Not found in contracts collection, try files collection
			try {
				await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					rowId: fileId,
				});
				// Found in files collection
				fileIdToUpdate = fileId;
			} catch (fileGetError: any) {
				console.error(
					"Document not found in either collection:",
					fileId,
					"Contract error:",
					contractError?.message,
					"File error:",
					fileGetError?.message,
				);
				throw new Error(
					`Document with ID ${fileId} does not exist in either collection.`,
				);
			}
		}

		// Update contract document if we have a contract ID
		if (contractIdToUpdate) {
			try {
				updatedDocument = await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: contractIdToUpdate,
					data: { contractName: newName },
				});
				console.log("✅ Contract document renamed successfully");
			} catch (contractError: any) {
				console.error("Failed to update contract document:", contractError);
				if (isContractId) {
					throw new Error(
						`Failed to rename contract: ${
							contractError?.message || "Unknown error"
						}`,
					);
				}
				// Non-blocking if it's not primarily a contract
			}
		}

		// Update file document if we have a file ID (non-blocking)
		if (fileIdToUpdate) {
			try {
				const updatedFile = await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					rowId: fileIdToUpdate,
					data: { name: newName },
				});
				// Use file document as result if contract update didn't happen
				if (!updatedDocument) {
					updatedDocument = updatedFile;
				}
				console.log("✅ File document renamed successfully");
			} catch (fileError: any) {
				console.warn(
					"⚠️ Failed to update file document (non-blocking):",
					fileError,
				);
				// Non-blocking - contract update may have succeeded
			}
		}

		if (!updatedDocument) {
			throw new Error("Failed to update document in either collection");
		}

		revalidatePath(path);
		return parseStringify(updatedDocument);
	} catch (error) {
		handleError(error, "Failed to rename file");
	}
};

export const updateFileUsers = async ({
	fileId,
	emails,
	path,
}: UpdateFileUsersProps) => {
	const { tablesDB } = await createAdminClient();

	try {
		// Get current user (who is sharing)
		const currentUser = await getCurrentUser();
		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		// First, try to check if this is a contract ID
		let actualFileDocumentId = fileId;
		let isContract = false;
		let contractDoc: any = null;
		let fileDoc: any = null;
		let fileName = "";
		let previousUsers: string[] = [];

		if (appwriteConfig.contractsCollectionId) {
			try {
				contractDoc = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: fileId,
				});

				// Contracts don't have a 'users' attribute, so we need to update the associated file document
				// Get the file document ID from the contract
				actualFileDocumentId =
					contractDoc.fileId || contractDoc.fileRef || null;
				isContract = true;
				fileName = contractDoc.contractName || contractDoc.name || "Contract";

				if (!actualFileDocumentId) {
					throw new Error(
						"Contract does not have an associated file document to update",
					);
				}
			} catch (_error: any) {
				// Not a contract, continue with file update using the original fileId
				isContract = false;
				actualFileDocumentId = fileId;
			}
		}

		// Get the file document to check previous users
		try {
			fileDoc = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.filesCollectionId!,
				rowId: actualFileDocumentId,
			});
			previousUsers = (fileDoc.users as string[]) || [];
			if (!fileName) {
				fileName = fileDoc.name || fileDoc.contractName || "Document";
			}
		} catch (error: any) {
			console.warn("Could not fetch previous file document:", error);
		}

		// Always update the file document (contracts reference file documents)
		const updatedFile = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.filesCollectionId!,
			rowId: actualFileDocumentId,
			data: { users: emails },
		});

		// Find newly added users (emails that weren't in previousUsers)
		const newUsers = emails.filter((email) => !previousUsers.includes(email));

		const viewDocumentPath = `/shared/files/${actualFileDocumentId}`;
		const shareFileMeta = {
			name: fileName,
			type: fileDoc?.type as string | undefined,
			extension: fileDoc?.extension as string | undefined,
		};
		const shareNotificationTitle = getFileShareNotificationTitle(shareFileMeta);
		const shareViewActionText = getFileShareViewActionText(shareFileMeta);
		const viewDocumentAction = {
			actionUrl: viewDocumentPath,
			actionText: shareViewActionText,
		};

		// Send notifications and emails to newly added users
		if (newUsers.length > 0) {
			await Promise.allSettled(
				newUsers.map(async (email) => {
					try {
						// Get recipient user info by email
						const recipientUser = await getUserByEmail(email);
						// The notification center uses user.$id from auth context, which is the user's document ID (not accountId)
						// So we need to use $id (document ID) for notifications to match the frontend query
						const recipientUserId = recipientUser?.$id; // Use document ID, not accountId
						const recipientName =
							recipientUser?.fullName || recipientUser?.name || email;

						console.log(`[SERVER] Processing notification for ${email}:`, {
							recipientUserId,
							recipientUserExists: !!recipientUser,
							recipientUserAccountId: recipientUser?.accountId,
							recipientUser$id: recipientUser?.$id,
							recipientEmail: recipientUser?.email,
						});

						// Get sharer info
						const sharerName =
							currentUser.fullName || currentUser.name || "A user";
						const sharerEmail = currentUser.email || "";

						// Create notification if user exists in system and has $id (document ID)
						if (recipientUserId && recipientUser?.$id) {
							try {
								// Try to create notification using the notification service with file_shared type
								// Fall back to simple createNotification if type doesn't exist
								let notificationCreated = false;

								try {
									const { notificationService } = await import(
										"@/lib/services/notificationService"
									);

									// Check if file_shared type exists, create it if it doesn't
									let typeExists =
										await notificationService.getNotificationType(
											"file_shared",
										);

									// If type doesn't exist, try to create it
									if (!typeExists) {
										try {
											await notificationService.createNotificationType({
												type_key: "file_shared",
												label: "File Shared",
												icon: "file-text",
												color_classes: "text-blue-600",
												bg_color_classes: "bg-blue-50",
												priority: "medium",
												enabled: true,
												description:
													"Notification when a document or file is shared with you",
											});
											typeExists =
												await notificationService.getNotificationType(
													"file_shared",
												);
											console.log(
												`[SERVER] Created file_shared notification type`,
											);
										} catch (createTypeError) {
											console.warn(
												`[SERVER] Could not create file_shared notification type:`,
												createTypeError,
											);
										}
									}

									if (typeExists && recipientUser?.$id) {
										try {
											const notification =
												await notificationService.createNotification({
													userId: recipientUser.$id, // Use document $id (matches auth context user.$id)
													title: shareNotificationTitle,
													message: `${sharerName} shared "${fileName}" with you.`,
													type: "file_shared",
													priority: "medium",
													...viewDocumentAction,
													metadata: {
														fileId: actualFileDocumentId,
														contractId: isContract ? fileId : undefined,
														fileName,
														sharedBy: currentUser.$id,
														sharedByName: sharerName,
													},
												});
											// Set flag immediately after successful creation to prevent fallback
											// Even if cache invalidation fails later, the notification is already created
											notificationCreated = true;
											console.log(
												`[SERVER] ✅ Created notification for file sharing: ${email}`,
												{
													notificationId: notification?.$id,
													userId: recipientUser.$id,
													recipientEmail: email,
												},
											);
										} catch (createError: any) {
											// Check if the error is from cache invalidation (non-critical) or actual creation failure
											const isCacheError =
												createError?.message?.includes("cache") ||
												createError?.message?.includes("Cache");
											if (isCacheError) {
												// If it's just a cache error, the notification was likely created successfully
												// Verify by checking if notification exists
												try {
													const { tablesDB } = await createAdminClient();
													const { Query } = await import("node-appwrite");
													const recentNotifications = await tablesDB.listRows({
														databaseId: appwriteConfig.databaseId!,
														tableId:
															appwriteConfig.notificationsCollectionId ||
															"notifications",
														queries: [
															Query.equal("userId", recipientUser.$id),
															Query.equal("type", "file_shared"),
															Query.orderDesc("$createdAt"),
															Query.limit(1),
														],
													});
													if (recentNotifications.total > 0) {
														const latest = recentNotifications.rows[0] as any;
														// Check if this notification was created in the last 5 seconds (likely our notification)
														const createdAt = new Date(
															latest.$createdAt,
														).getTime();
														const now = Date.now();
														if (
															now - createdAt < 5000 &&
															latest.title === shareNotificationTitle
														) {
															notificationCreated = true;
															console.log(
																`[SERVER] ✅ Notification created successfully (verified after cache error): ${email}`,
																{ notificationId: latest.$id },
															);
														}
													}
												} catch (verifyError) {
													console.warn(
														`[SERVER] Could not verify notification after cache error:`,
														verifyError,
													);
												}
											} else {
												// Actual creation failure - log and let fallback handle it
												console.warn(
													`[SERVER] Notification service createNotification failed:`,
													createError,
												);
											}
										}
									}
								} catch (serviceError: any) {
									// If notification service fails (e.g., type doesn't exist), try fallback
									console.warn(
										`[SERVER] Notification service failed, trying fallback:`,
										serviceError,
									);
								}

								// Fallback: Use simple createNotification action (doesn't require type to exist)
								// orgId is REQUIRED in the database schema, so we must get it
								// Also check for duplicates before creating
								if (!notificationCreated && recipientUser?.$id) {
									try {
										// Check for duplicate notification created in the last 10 seconds
										// This prevents duplicates if notificationService.createNotification succeeded
										// but threw an error after creation (e.g., in cache invalidation)
										const { tablesDB: duplicateCheckDB } =
											await createAdminClient();
										const { Query } = await import("node-appwrite");
										const tenSecondsAgo = new Date(
											Date.now() - 10000,
										).toISOString();
										const duplicateCheck = await duplicateCheckDB.listRows({
											databaseId: appwriteConfig.databaseId!,
											tableId:
												appwriteConfig.notificationsCollectionId ||
												"notifications",
											queries: [
												Query.equal("userId", recipientUser.$id),
												Query.equal("type", "file_shared"),
												Query.greaterThan("$createdAt", tenSecondsAgo),
												Query.limit(1),
											],
										});

										if (duplicateCheck.total > 0) {
											console.log(
												`[SERVER] ⚠️ Duplicate notification prevented for ${email} - notification already exists`,
											);
											notificationCreated = true; // Mark as created to prevent fallback
											// Skip creating notification - it already exists
										} else {
											// Get orgId for the recipient user - REQUIRED field
											// First try to use the user's orgId if it exists directly
											let orgId = recipientUser.orgId;

											// If not found, try to get it from getUserDefaultOrganization
											if (!orgId) {
												// Try with user's $id (document ID) first, then accountId
												const defaultOrg = await getUserDefaultOrganization(
													recipientUser.$id || recipientUser.accountId,
												);
												orgId = defaultOrg?.orgId;
											}

											if (!orgId) {
												throw new Error(
													`User ${email} has no default organization. User object: ${JSON.stringify(
														{
															$id: recipientUser.$id,
															accountId: recipientUser.accountId,
															orgId: recipientUser.orgId,
														},
													)}`,
												);
											}

											// Use tablesDB directly to create notification with all required fields
											const { tablesDB } = await createAdminClient();
											const notificationData: Record<string, any> = {
												userId: recipientUser.$id, // Use document $id (matches auth context user.$id)
												title: shareNotificationTitle,
												message: `${sharerName} shared "${fileName}" with you.`,
												type: "file_shared",
												read: false,
												orgId: orgId, // REQUIRED field - must be included
												actionUrl: viewDocumentAction.actionUrl,
												actionText: viewDocumentAction.actionText,
												metadata: JSON.stringify({
													fileId: actualFileDocumentId,
													contractId: isContract ? fileId : undefined,
													fileName,
													sharedBy: currentUser.$id,
													sharedByName: sharerName,
												}),
											};

											const notification = await tablesDB.createRow({
												databaseId: appwriteConfig.databaseId!,
												tableId:
													appwriteConfig.notificationsCollectionId ||
													"notifications",
												rowId: ID.unique(),
												data: notificationData,
											});

											// Verify the notification was created and can be queried
											try {
												// First verify by ID
												const verifyById = await tablesDB.listRows({
													databaseId: appwriteConfig.databaseId!,
													tableId:
														appwriteConfig.notificationsCollectionId ||
														"notifications",
													queries: [Query.equal("$id", notification.$id)],
												});

												// Then verify by userId (how the notification center queries)
												const verifyByUserId = await tablesDB.listRows({
													databaseId: appwriteConfig.databaseId!,
													tableId:
														appwriteConfig.notificationsCollectionId ||
														"notifications",
													queries: [
														Query.equal("userId", recipientUser.$id),
														Query.orderDesc("$createdAt"),
														Query.limit(5), // Get last 5 notifications for this user
													],
												});

												console.log(
													`[SERVER] ✅ Verified notification exists in database:`,
													{
														notificationId: notification?.$id,
														foundById: verifyById.total > 0,
														foundByUserId: verifyByUserId.total > 0,
														totalForUser: verifyByUserId.total,
														userId: recipientUser.$id,
														userNotifications: verifyByUserId.rows.map(
															(n: any) => ({
																id: n.$id,
																title: n.title,
																userId: n.userId,
																type: n.type,
															}),
														),
													},
												);
											} catch (verifyError) {
												console.error(
													`[SERVER] ❌ Could not verify notification:`,
													verifyError,
												);
											}

											notificationCreated = true;

											// Log successful creation with all details
											console.log(
												`[SERVER] ✅ SUCCESS: Created notification for ${email}`,
												{
													notificationId: notification?.$id,
													userId: recipientUser.$id,
													recipientEmail: email,
													orgId: orgId,
													notificationData: JSON.stringify(notificationData),
													recipientUserAccountId: recipientUser.accountId,
													recipientUser$id: recipientUser.$id,
													recipientUserOrgId: recipientUser.orgId,
													collectionId:
														appwriteConfig.notificationsCollectionId ||
														"notifications",
													databaseId: appwriteConfig.databaseId,
												},
											);

											// Invalidate cache to ensure notification appears immediately
											// This includes unread count cache for instant badge update
											try {
												const { CacheManager } = await import(
													"@/lib/services/cache-manager"
												);
												await CacheManager.invalidateNotifications(
													recipientUser.$id,
												);
												console.log(
													`[SERVER] Invalidated notification cache (including unread count) for ${recipientUser.$id}`,
												);
											} catch (cacheError) {
												console.warn(
													`[SERVER] Could not invalidate cache:`,
													cacheError,
												);
											}

											try {
												const { broadcastNotificationToUser } = await import(
													"@/lib/notifications/broadcastNotification"
												);
												await broadcastNotificationToUser(recipientUser.$id, {
													...(notification as Record<string, unknown>),
													id: notification.$id,
												});
											} catch (broadcastError) {
												console.warn(
													`[SERVER] SSE broadcast failed for ${email}:`,
													broadcastError,
												);
											}
										}
									} catch (fallbackError) {
										console.error(
											`[SERVER] Could not create notification for ${email}:`,
											fallbackError,
											{ recipientUser, recipientUserId },
										);
									}
								} else if (!recipientUser?.$id) {
									console.warn(
										`[SERVER] Cannot create notification for ${email} - user has no $id (document ID)`,
										{ recipientUser },
									);
								}
							} catch (notificationError) {
								console.error(
									`[SERVER] Failed to create notification for ${email}:`,
									notificationError,
								);
								// Continue with email even if notification fails
							}
						}

						// Send email notification
						try {
							const { mailgunService } = await import("@/lib/services/mailgun");
							const baseUrl =
								process.env.NEXT_PUBLIC_APP_URL ||
								"https://www.caalmsolutions.com";
							const fileUrl = `${baseUrl}${viewDocumentPath}`;

							const emailSubject = `[CAALM] Document Shared: ${fileName}`;
							const emailText = `Hello ${recipientName},\n\n${sharerName} (${sharerEmail}) shared the document "${fileName}" with you.\n\nYou can now access this document in your CAALM account.\n\nView Document: ${fileUrl}\n\nBest regards,\nCAALM Solutions Team`;

							const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #078FAB; text-align: center;">CAALM Solutions</h2>
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Document Shared with You</h3>
                    <p style="color: #666; font-size: 16px;">${sharerName} <span style="color: #888;">(${sharerEmail})</span> shared the document <strong>"${fileName}"</strong> with you in CAALM.</p>
                    <p style="color: #666; font-size: 16px;">You can now view and access this document in your account.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${fileUrl}" style="background-color: #078FAB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Document</a>
                    </div>
                  </div>
                  <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
                </div>
              `;

							await mailgunService.sendEmail({
								to: email,
								subject: emailSubject,
								text: emailText,
								html: emailHtml,
							});
							console.log(
								`[SERVER] Sent email notification for file sharing: ${email}`,
							);
						} catch (emailError) {
							console.error(
								`[SERVER] Failed to send email notification for ${email}:`,
								emailError,
							);
						}
					} catch (error) {
						console.error(
							`[SERVER] Error processing notification for ${email}:`,
							error,
						);
					}
				}),
			);
			console.log(
				`[SERVER] Completed sending notifications for ${newUsers.length} new users`,
			);
		}

		revalidatePath(path);
		return parseStringify(updatedFile);
	} catch (error) {
		handleError(error, "Failed to update file users");
	}
};

export const deleteFile = async ({
	fileId,
	bucketFileId,
	path,
	contractId,
}: DeleteFileProps & { contractId?: string }) => {
	const { tablesDB, storage } = await createAdminClient();

	try {
		console.log("Deleting fileId:", fileId, "contractId:", contractId);

		// Validate inputs
		if (!fileId) {
			throw new Error("File ID is required");
		}

		// Determine if this is a contract deletion
		// If contractId is provided, fileId is the contract ID
		const isContract = !!contractId;
		let actualFileDocumentId: string | null = null;
		let actualBucketFileId: string | null = bucketFileId || null;

		if (isContract) {
			// This is a contract - fileId is actually the contract ID
			const contractIdToDelete = fileId;

			// First, get the contract document to find the associated file document
			try {
				const contractDoc = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: contractIdToDelete,
				});

				// Get the file document ID from the contract
				actualFileDocumentId =
					contractDoc.fileId || contractDoc.fileRef || null;
				actualBucketFileId = bucketFileId || contractDoc.bucketFileId || null;

				console.log("Contract document found:", {
					contractId: contractIdToDelete,
					fileDocumentId: actualFileDocumentId,
					bucketFileId: actualBucketFileId,
				});
			} catch (_error: any) {
				console.log(
					"Contract document not found, may have been deleted already",
				);
				// Continue with deletion attempt
			}

			// Start operations for contract deletion
			// Delete in sequence to avoid constraint issues
			try {
				// 0. Delete related enterprise metadata documents first (if they exist)
				try {
					const enterpriseMetadataCollectionId =
						appwriteConfig.contractsEnterpriseMetadataCollectionId ||
						appwriteConfig.contractExtensionsCollectionId;

					if (enterpriseMetadataCollectionId) {
						const enterpriseDocs = await tablesDB.listRows({
							databaseId: appwriteConfig.databaseId!,
							tableId: enterpriseMetadataCollectionId,
							queries: [Query.equal("contractId", contractIdToDelete)],
						});

						// Delete all related enterprise metadata documents
						for (const doc of enterpriseDocs.rows) {
							try {
								await tablesDB.deleteRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: enterpriseMetadataCollectionId,
									rowId: doc.$id,
								});
								console.log("Enterprise metadata document deleted:", doc.$id);
							} catch (error: any) {
								console.log("Error deleting enterprise metadata:", error);
								// Continue with other deletions
							}
						}
					}
				} catch (error: any) {
					console.log("Error finding enterprise metadata:", error);
					// Continue with contract deletion even if enterprise metadata lookup fails
				}

				// 1. Delete the contract document
				try {
					await tablesDB.deleteRow({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractsCollectionId!,
						rowId: contractIdToDelete,
					});
					console.log("Contract document deleted successfully");
				} catch (error: any) {
					if (error?.code === 404 || error?.message?.includes("not found")) {
						console.log("Contract document not found, skipping deletion");
					} else {
						console.error("Error deleting contract document:", error);
						throw error;
					}
				}

				// 2. Delete the file document (if we found the file document ID)
				if (actualFileDocumentId) {
					try {
						// Clear owner relationship first to avoid two-way relationship constraint issues
						try {
							const fileDoc = await tablesDB.getRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.filesCollectionId!,
								rowId: actualFileDocumentId,
							});
							if (fileDoc.owner) {
								await tablesDB.updateRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.filesCollectionId!,
									rowId: actualFileDocumentId,
									data: { owner: null },
								});
								console.log("Owner relationship cleared before deletion");
							}
						} catch (clearError: any) {
							console.log(
								"Could not clear owner relationship, continuing with deletion:",
								clearError.message,
							);
							// Continue with deletion even if clearing owner fails
						}

						await tablesDB.deleteRow({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.filesCollectionId!,
							rowId: actualFileDocumentId,
						});
						console.log("File document deleted successfully");
					} catch (error: any) {
						if (error?.code === 404 || error?.message?.includes("not found")) {
							console.log("File document not found, skipping deletion");
						} else {
							console.error("Error deleting file document:", error);
							// Don't throw - continue with storage deletion
						}
					}
				}

				// 3. Delete the storage file
				if (actualBucketFileId) {
					try {
						await storage.deleteFile({
							bucketId: appwriteConfig.bucketId!,
							fileId: actualBucketFileId,
						});
						console.log("Storage file deleted successfully");
					} catch (error: any) {
						if (error?.code === 404 || error?.message?.includes("not found")) {
							console.log("Storage file not found, skipping deletion");
						} else {
							console.error("Error deleting storage file:", error);
							// Don't throw - storage deletion is less critical
						}
					}
				}
			} catch (error: any) {
				console.error("Error during contract deletion:", error);
				throw error;
			}
		} else {
			// This is a regular file deletion
			// Start all operations in parallel for better performance
			const operations = [
				// 1. Find and delete contract document (if exists)
				tablesDB
					.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractsCollectionId!,
						queries: [Query.equal("fileId", fileId)],
					})
					.then(async (contractDocs) => {
						if (contractDocs.rows.length > 0) {
							const contractIdToDelete = contractDocs.rows[0].$id;
							try {
								return await tablesDB.deleteRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.contractsCollectionId!,
									rowId: contractIdToDelete,
								});
							} catch (error: any) {
								if (
									error?.code === 404 ||
									error?.message?.includes("not found")
								) {
									console.log("Contract document not found, skipping deletion");
									return null;
								}
								throw error;
							}
						}
						return null;
					})
					.catch((error) => {
						console.log("Error finding/deleting contract:", error);
						return null;
					}),

				// 2. Delete the file document
				// First, ensure the file has orgId if required (fixes deletion errors for old records)
				// Also clear owner relationship to avoid two-way relationship constraint issues
				tablesDB
					.getRow({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.filesCollectionId!,
						rowId: fileId,
					})
					.then(async (fileDoc) => {
						// If orgId is missing, set a default before deletion
						if (!fileDoc.orgId) {
							const defaultOrg = await getUserDefaultOrganization(
								fileDoc.owner || fileDoc.accountId,
							);
							if (defaultOrg?.orgId) {
								await tablesDB.updateRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.filesCollectionId!,
									rowId: fileId,
									data: { orgId: defaultOrg.orgId },
								});
							}
						}
						// Clear owner relationship to avoid two-way relationship constraint issues
						if (fileDoc.owner) {
							try {
								await tablesDB.updateRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.filesCollectionId!,
									rowId: fileId,
									data: { owner: null },
								});
								console.log("Owner relationship cleared before deletion");
							} catch (clearError: any) {
								console.log(
									"Could not clear owner relationship, continuing with deletion:",
									clearError.message,
								);
								// Continue with deletion even if clearing owner fails
							}
						}
						// Now delete
						return tablesDB.deleteRow({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.filesCollectionId!,
							rowId: fileId,
						});
					})
					.catch((error: any) => {
						if (error?.code === 404 || error?.message?.includes("not found")) {
							console.log("File document not found, skipping deletion");
							return null;
						}
						// If getRow fails, try direct deletion anyway
						if (error?.code !== 404) {
							return tablesDB.deleteRow({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.filesCollectionId!,
								rowId: fileId,
							});
						}
						throw error;
					}),

				// 3. Delete the storage file
				bucketFileId
					? storage
							.deleteFile({
								bucketId: appwriteConfig.bucketId!,
								fileId: bucketFileId,
							})
							.catch((error: any) => {
								if (
									error?.code === 404 ||
									error?.message?.includes("not found")
								) {
									console.log("Storage file not found, skipping deletion");
									return null;
								}
								throw error;
							})
					: Promise.resolve(null),
			];

			await Promise.all(operations);
		}

		revalidatePath(path);
		await CacheManager.invalidateStorage();
		return parseStringify({ status: "success" });
	} catch (error) {
		handleError(error, "Failed to delete file");
	}
};

export async function getTotalSpaceUsed() {
	try {
		const { tablesDB } = await createAdminClient();

		// Try to get user from session first, then fall back to 2FA-based auth
		let currentUser = await getCurrentUser();

		if (!currentUser) {
			// If no session-based user, try 2FA-based user
			const { getCurrentUserFrom2FA } = await import("./user.actions");
			currentUser = await getCurrentUserFrom2FA();
		}

		if (!currentUser) {
			console.error(
				"getCurrentUser returned null/undefined in getTotalSpaceUsed",
			);
			return parseStringify({
				image: { size: 0, latestDate: "" },
				document: { size: 0, latestDate: "" },
				video: { size: 0, latestDate: "" },
				audio: { size: 0, latestDate: "" },
				other: { size: 0, latestDate: "" },
				used: 0,
				all: 2 * 1024 * 1024 * 1024,
			});
		}

		let files;
		try {
			files = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.filesCollectionId!,
				queries: [Query.equal("owner", currentUser.$id)],
			});
		} catch (error: any) {
			// Handle case where 'owner' attribute might not be available yet (e.g., still processing)
			if (error?.message?.includes("Attribute not found in schema: owner")) {
				console.warn(
					"Owner attribute not available, fetching all files and filtering in memory",
				);
				// Fallback: fetch all files and filter in memory
				const allFiles = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					queries: [Query.limit(10000)], // Large limit to get all files
				});
				// Filter by owner in memory
				files = {
					...allFiles,
					rows: allFiles.rows.filter((file: any) => {
						const fileOwner =
							typeof file.owner === "string" ? file.owner : file.owner?.$id;
						return fileOwner === currentUser.$id;
					}),
				};
			} else {
				throw error;
			}
		}

		const totalSpace = {
			image: { size: 0, latestDate: "" },
			document: { size: 0, latestDate: "" },
			video: { size: 0, latestDate: "" },
			audio: { size: 0, latestDate: "" },
			other: { size: 0, latestDate: "" },
			used: 0,
			all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
		};

		files.rows.forEach((file) => {
			const fileType = file.type as FileType;
			totalSpace[fileType].size += file.size;
			totalSpace.used += file.size;

			if (
				!totalSpace[fileType].latestDate ||
				new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
			) {
				totalSpace[fileType].latestDate = file.$updatedAt;
			}
		});

		return parseStringify(totalSpace);
	} catch (error) {
		console.error("Error calculating total space used:", error);
		// Return default empty space on error instead of throwing
		return parseStringify({
			image: { size: 0, latestDate: "" },
			document: { size: 0, latestDate: "" },
			video: { size: 0, latestDate: "" },
			audio: { size: 0, latestDate: "" },
			other: { size: 0, latestDate: "" },
			used: 0,
			all: 2 * 1024 * 1024 * 1024,
		});
	}
}

export interface AssignContractProps {
	fileId: string;
	managerAccountIds: string[];
	path: string;
	fileDocumentId?: string; // Add file document ID for updating isContract
}

export const assignContract = async ({
	fileId,
	managerAccountIds,
	path,
	fileDocumentId,
}: AssignContractProps) => {
	const { tablesDB } = await createAdminClient();
	try {
		// Fetch the contract document from the contracts collection
		let contractDoc;
		try {
			contractDoc = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: fileId,
			});
		} catch (error) {
			console.error("Contract document not found with ID:", fileId, error);
			console.error("Available collections:", {
				databaseId: appwriteConfig.databaseId,
				contractsCollectionId: appwriteConfig.contractsCollectionId,
				fileId: fileId,
				fileDocumentId: fileDocumentId,
			});

			// Try to find the contract by fileId in the contracts collection
			try {
				const contracts = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					queries: [Query.equal("fileId", fileDocumentId || "")],
				});

				if (contracts.rows.length > 0) {
					contractDoc = contracts.rows[0];
					console.log("Found contract by fileId:", contractDoc);
				} else {
					throw new Error("No contract found with matching fileId");
				}
			} catch (searchError) {
				console.error("Failed to search for contract by fileId:", searchError);
				throw new Error(
					`Contract document not found. Please ensure the file is properly uploaded as a contract.`,
				);
			}
		}

		// Validate that contract document exists and has required fields
		if (!contractDoc?.$id) {
			throw new Error("Invalid contract document. Cannot assign.");
		}

		// Update the contract document: assign manager(s)
		const updatedContract = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			rowId: contractDoc.$id, // Use the actual contract document ID
			data: {
				assignedManagers: managerAccountIds,
			},
		});

		// Update the file document: set isContract true (use contract's fileId if available)
		// The fileId field in the contract document links to the file in Files collection
		const actualFileId = (contractDoc as any).fileId || fileDocumentId;
		if (actualFileId) {
			try {
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					rowId: actualFileId,
					data: {
						isContract: true,
					},
				});
			} catch (fileUpdateError) {
				// Log but don't fail if file document doesn't exist
				// This can happen if the contract was created without a corresponding file document
				console.warn(
					"Could not update file document (may not exist):",
					actualFileId,
					fileUpdateError,
				);
			}
		}
		revalidatePath(path);
		return parseStringify({
			contract: updatedContract,
			contractId: contractDoc.$id,
		});
	} catch (error) {
		handleError(error, "Failed to assign contract");
	}
};

// Fetch allowed contract status enums from the database
export const getContractStatusEnums = async () => {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId;
	const tableId = appwriteConfig.contractsCollectionId;

	if (!databaseId || !tableId) {
		console.warn(
			"Database or contracts collection ID is not configured, using fallback status enums",
		);
		// Fallback to constants if config is missing
		return [
			"active",
			"inactive",
			"pending-review",
			"action-required",
			"expired",
		];
	}

	const attrKey = "status";
	try {
		// Type assertion to fix linter error
		const attr = (await tablesDB.getColumn({
			databaseId,
			tableId,
			key: attrKey,
		})) as { elements?: string[] };

		const elements = attr.elements || [];

		// If we got elements from the database, return them
		if (elements.length > 0) {
			return elements;
		}

		// Fallback to constants if database returns empty array
		console.warn(
			"Database returned empty status enum elements, using fallback constants",
		);
		return [
			"active",
			"inactive",
			"pending-review",
			"action-required",
			"expired",
		];
	} catch (error) {
		console.error(
			"Failed to fetch contract status enums from database:",
			error,
		);
		// Fallback to constants on error instead of throwing
		console.warn("Using fallback status enums due to database error");
		return [
			"active",
			"inactive",
			"pending-review",
			"action-required",
			"expired",
		];
	}
};

// Update contract status by fileId
export const contractStatus = async ({
	fileId,
	status,
	path,
	workflowDecision = false,
	adminOverride = false,
}: {
	fileId: string;
	status: string;
	path: string;
	/** Set true when status change comes from approval workflow decide() */
	workflowDecision?: boolean;
	/** Super Admin / Org Admin emergency override */
	adminOverride?: boolean;
}) => {
	const { tablesDB } = await createAdminClient();

	// These fields are now string arrays (not relationship attributes), so they don't need normalization
	// They can accept empty arrays [] or null without validation errors
	const stringArrayFields = [
		"assignedManagers",
		"internalApproverIds",
		"relatedDocumentIds",
		"attachmentReferences",
		"keyObligations",
	];

	try {
		// First, fetch the contract to check for relationship fields stored as arrays
		let contract: any = null;
		let relationshipFields: string[] = [];

		try {
			contract = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: fileId,
			});

			const previousStatus = String(contract?.status || "").toLowerCase();
			const nextStatus = String(status || "").toLowerCase();
			const activatingFromReview =
				nextStatus === "active" &&
				(previousStatus === "pending-review" ||
					previousStatus === "action-required");
			if (activatingFromReview && !workflowDecision && !adminOverride) {
				throw new Error(
					"Contracts in review must be activated through the approval workflow (executive step).",
				);
			}

			// Get relationship fields from schema
			try {
				// Try getCollection first (matches pattern in list-attributes/route.ts)
				// Note: getCollection may not be in TypeScript types but exists in runtime
				let collection: any;
				try {
					collection = await (tablesDB as any).getCollection({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractsCollectionId!,
					});
					relationshipFields = (collection?.attributes || [])
						.filter((attr: any) => attr.type === "relationship")
						.map((attr: any) => attr.key);
				} catch (_error: any) {
					// Fallback: try to get attributes via listColumns
					try {
						const columns = await tablesDB.listColumns({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.contractsCollectionId!,
						});
						const attributes = columns.columns || [];
						relationshipFields = attributes
							.filter((attr: any) => attr.type === "relationship")
							.map((attr: any) => attr.key);
					} catch {
						// Final fallback to known relationship fields
						relationshipFields = [
							"fileId",
							"fileRef",
							"owner",
							"contractOwnerId",
							"parentContractId",
							"orgId",
						];
					}
				}
			} catch {
				// Fallback to known relationship fields
				relationshipFields = [
					"fileId",
					"fileRef",
					"owner",
					"contractOwnerId",
					"parentContractId",
					"orgId",
				];
			}

			// Standard relationship fields that need normalization if stored as arrays
			const standardRelationshipFields = [
				"fileId",
				"fileRef",
				"owner",
				"contractOwnerId",
				"parentContractId",
			];

			const fieldsToNormalize = standardRelationshipFields;
			const normalizationData: any = {};

			// Normalize only actual relationship fields that are stored as arrays
			// String array fields (assignedManagers, etc.) are now properly configured and don't need normalization
			for (const field of fieldsToNormalize) {
				if (field in contract) {
					const fieldValue = contract[field];
					const isArray = Array.isArray(fieldValue);
					const isRelationshipField = relationshipFields.includes(field);

					if (isArray && isRelationshipField) {
						// For empty arrays, set to null
						// For non-empty arrays, take first item if it's an ID
						if (fieldValue.length === 0) {
							normalizationData[field] = null;
						} else {
							const firstItem = fieldValue[0];
							if (typeof firstItem === "string" && firstItem.length === 24) {
								// Likely an Appwrite ID
								normalizationData[field] = firstItem;
							} else if (firstItem?.$id && typeof firstItem.$id === "string") {
								normalizationData[field] = firstItem.$id;
							} else {
								// Not a valid ID, set to null
								normalizationData[field] = null;
							}
						}
					}
				}
			}

			// If we have fields to normalize, update them first (without status)
			let _normalizationSucceeded = false;
			if (Object.keys(normalizationData).length > 0) {
				try {
					// Try to update all fields at once first (more efficient)
					try {
						await tablesDB.updateRow({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.contractsCollectionId!,
							rowId: fileId,
							data: normalizationData,
						});
						_normalizationSucceeded = true;
					} catch (_bulkError: any) {
						// If bulk update fails, try updating fields one at a time
						let successCount = 0;
						for (const [field, value] of Object.entries(normalizationData)) {
							try {
								await tablesDB.updateRow({
									databaseId: appwriteConfig.databaseId!,
									tableId: appwriteConfig.contractsCollectionId!,
									rowId: fileId,
									data: { [field]: value },
								});
								successCount++;
							} catch (_fieldError: any) {
								// Continue with other fields
							}
						}
						if (successCount > 0) {
							_normalizationSucceeded = true;
						}
					}
				} catch (normalizeError: any) {
					console.error(
						"[contractStatus] Failed to normalize relationship fields:",
						{
							error: normalizeError?.message,
							errorType: normalizeError?.type,
							fields: Object.keys(normalizationData),
						},
					);
					// Don't throw - continue to try status update anyway
					// The status update might still work if the fields aren't actually problematic
				}
			}

			// Now try to update the status
			// If normalization was attempted, fields should be normalized by now
			// If no normalization was needed, try direct update
			try {
				// Ensure relationship fields are not arrays in the update payload
				// Even though we're only updating status, Appwrite validates all relationship fields
				const updateData: any = { status };

				// If we have the contract and normalization data, include normalized fields in the update
				// This ensures relationship fields are properly formatted before Appwrite validates them
				if (contract && Object.keys(normalizationData).length > 0) {
					// Include normalized fields in the update payload
					Object.assign(updateData, normalizationData);
				}

				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: fileId,
					data: updateData,
				});
			} catch (statusUpdateError: any) {
				// If status update fails, check if it's a relationship validation error
				const isRelationshipError =
					statusUpdateError?.type === "relationship_value_invalid" ||
					statusUpdateError?.message?.includes("Invalid relationship value") ||
					statusUpdateError?.message?.includes("Array given");

				if (isRelationshipError) {
					console.error(
						"[contractStatus] Status update failed with relationship error:",
						{
							error: statusUpdateError?.message,
							errorType: statusUpdateError?.type,
							normalizationAttempted: Object.keys(normalizationData).length > 0,
							fieldsNormalized: Object.keys(normalizationData),
						},
					);

					// If we already tried normalization and it failed, provide detailed error
					if (Object.keys(normalizationData).length > 0) {
						const fieldsToFix = Object.keys(normalizationData).join(", ");
						throw new Error(
							`Cannot update contract status: relationship fields are stored as arrays and cannot be automatically fixed. ` +
								`Appwrite is rejecting updates to fix these fields. ` +
								`Please fix these fields manually in the Appwrite Console: ${fieldsToFix}. ` +
								`For each field, change empty arrays [] to null. Contract ID: ${fileId}. ` +
								`Original error: ${
									statusUpdateError?.message || "Unknown error"
								}`,
						);
					} else {
						// No normalization was attempted, but we got a relationship error
						// This means the fields might be arrays but weren't detected
						// Provide a generic error message
						throw new Error(
							`Cannot update contract status: relationship validation error. ` +
								`Please check the contract document in Appwrite Console and ensure all relationship fields ` +
								`(fileId, fileRef, owner, contractOwnerId, parentContractId) are either valid IDs or null, not arrays. ` +
								`Contract ID: ${fileId}. ` +
								`Original error: ${
									statusUpdateError?.message || "Unknown error"
								}`,
						);
					}
				}
				// Re-throw other errors as-is
				throw statusUpdateError;
			}

			// Fetch the updated contract
			const updated = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: fileId,
			});

			// Create a recent activity for the contract status change
			try {
				await createContractActivity(
					`Contract ${status.replace("-", " ")}`,
					updated.contractName || "Contract",
					fileId,
					"User",
					"User",
				);
			} catch (error) {
				console.error("Failed to create contract status activity:", error);
			}

			// Trigger contract renewal notification if status is 'renewed'
			if (status === "renewed" && updated.contractExpiryDate) {
				try {
					await triggerContractRenewalNotification(
						updated.owner || "system",
						updated.contractName || "Contract",
						updated.contractExpiryDate,
					);
				} catch (error) {
					console.error(
						"Failed to trigger contract renewal notification:",
						error,
					);
				}
			}

			revalidatePath(path);
			return parseStringify(updated);
		} catch (updateError: any) {
			// If the error is already a formatted message from inner catch, re-throw it as-is
			if (
				updateError?.message?.includes(
					"Cannot update contract status: relationship fields are stored as arrays",
				)
			) {
				throw updateError;
			}

			// If the error is about relationship validation, provide helpful information
			if (
				updateError?.type === "relationship_value_invalid" ||
				updateError?.message?.includes("Invalid relationship value") ||
				updateError?.message?.includes("Array given")
			) {
				let contract: any = null;
				let contractFetchError: any = null;

				// Try to get the contract document to identify problematic fields
				try {
					contract = await tablesDB.getRow({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractsCollectionId!,
						rowId: fileId,
					});
				} catch (error) {
					contractFetchError = error;
					console.error(
						"[contractStatus] Failed to fetch contract document:",
						error,
					);
				}

				// Get collection attributes to identify relationship fields
				let relationshipFields: string[] = [];
				let allAttributes: any[] = [];
				try {
					// Try getCollection first (matches pattern in list-attributes/route.ts)
					// Note: getCollection may not be in TypeScript types but exists in runtime
					let collection: any;
					try {
						collection = await (tablesDB as any).getCollection({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.contractsCollectionId!,
						});
						allAttributes = collection?.attributes || [];
						relationshipFields = allAttributes
							.filter((attr: any) => attr.type === "relationship")
							.map((attr: any) => attr.key);
					} catch (_error: any) {
						// Fallback: try to get attributes via listColumns
						try {
							const columns = await tablesDB.listColumns({
								databaseId: appwriteConfig.databaseId!,
								tableId: appwriteConfig.contractsCollectionId!,
							});
							allAttributes = columns.columns || [];
							relationshipFields = allAttributes
								.filter((attr: any) => attr.type === "relationship")
								.map((attr: any) => attr.key);
						} catch {
							// Final fallback to known relationship fields
							relationshipFields = [
								"fileId",
								"fileRef",
								"owner",
								"contractOwnerId",
								"parentContractId",
								"orgId",
							];
						}
					}
				} catch (error) {
					console.error(
						"[contractStatus] Failed to get collection attributes:",
						error,
					);
					// Fallback to known relationship fields
					relationshipFields = [
						"fileId",
						"fileRef",
						"owner",
						"contractOwnerId",
						"parentContractId",
						"orgId",
					];
				}

				// Find ALL array fields in the contract (including empty arrays)
				const allContractFields = contract
					? Object.keys(contract).filter((k) => !k.startsWith("$"))
					: [];
				const allArrayFields: Array<{
					field: string;
					value: any;
					isRelationship: boolean;
				}> = [];

				if (contract) {
					for (const field of allContractFields) {
						const value = contract[field];
						// Check for arrays (including empty ones) - empty arrays can also cause validation errors
						if (Array.isArray(value)) {
							const isRelationship = relationshipFields.includes(field);
							allArrayFields.push({
								field,
								value: value,
								isRelationship,
							});
						}
					}
				}

				// Identify problematic fields (relationship fields that are arrays)
				const problematicFields: Array<{ field: string; value: any }> =
					allArrayFields
						.filter((f) => f.isRelationship)
						.map((f) => ({ field: f.field, value: f.value }));

				// Exclude string array fields from problematic check - they're valid as arrays
				// Filter out string array fields from allArrayFields
				const nonStringArrayFields = allArrayFields.filter(
					(f) => !stringArrayFields.includes(f.field),
				);

				// If no relationship arrays found, check if any non-string-array field contains IDs (might be misconfigured)
				if (problematicFields.length === 0 && nonStringArrayFields.length > 0) {
					for (const arrayField of nonStringArrayFields) {
						// Check if array contains IDs (strings of length 24 are likely Appwrite IDs)
						// Also check empty arrays as they might be the issue
						const containsIds =
							arrayField.value.length === 0 ||
							arrayField.value.some(
								(item: any) =>
									(typeof item === "string" && item.length === 24) ||
									(typeof item === "object" &&
										item?.$id &&
										typeof item.$id === "string" &&
										item.$id.length === 24),
							);
						if (containsIds) {
							problematicFields.push({
								field: arrayField.field,
								value: arrayField.value,
							});
						}
					}
				}

				// If still no problematic fields found, list ALL relationship fields and their values
				const relationshipFieldValues: Array<{
					field: string;
					value: any;
					isArray: boolean;
				}> = [];
				if (contract) {
					for (const field of relationshipFields) {
						if (field in contract) {
							const value = contract[field];
							relationshipFieldValues.push({
								field,
								value: value,
								isArray: Array.isArray(value),
							});
						}
					}
				}

				// Log COMPLETE contract structure for debugging
				console.error(
					"[contractStatus] Relationship validation error - Full contract structure:",
					{
						contractId: fileId,
						contractFetched: !!contract,
						contractFetchError: contractFetchError
							? String(contractFetchError)
							: null,
						contractKeys: allContractFields,
						contractData: contract
							? JSON.stringify(contract, null, 2)
							: "CONTRACT FETCH FAILED",
						relationshipFieldsFromSchema: relationshipFields,
						allAttributes: allAttributes.map((a: any) => ({
							key: a.key,
							type: a.type,
						})),
						relationshipFieldValues: relationshipFieldValues.map((f) => ({
							field: f.field,
							value: f.value,
							valueType: typeof f.value,
							isArray: f.isArray,
							arrayLength: Array.isArray(f.value) ? f.value.length : null,
						})),
						allArrayFields: allArrayFields.map((f) => ({
							field: f.field,
							arrayLength: f.value.length,
							firstItem: f.value[0],
							isRelationship: f.isRelationship,
						})),
						problematicFields: problematicFields.map((p) => ({
							field: p.field,
							arrayLength: p.value.length,
							firstItem: p.value[0],
							allItems: p.value,
						})),
						errorType: updateError?.type,
						errorMessage: updateError?.message,
						errorResponse: updateError?.response,
					},
				);

				// Throw a more helpful error message
				let fieldNames: string;
				if (problematicFields.length > 0) {
					fieldNames = problematicFields
						.map(
							(p) =>
								`${p.field} (array with ${
									p.value.length
								} items: ${JSON.stringify(p.value.slice(0, 3))}${
									p.value.length > 3 ? "..." : ""
								})`,
						)
						.join(", ");
				} else if (relationshipFieldValues.length > 0) {
					// List all relationship fields and their types
					const arrayFields = relationshipFieldValues.filter((f) => f.isArray);
					if (arrayFields.length > 0) {
						fieldNames = arrayFields
							.map((f) => `${f.field} (array)`)
							.join(", ");
					} else {
						fieldNames = `All relationship fields: ${relationshipFieldValues
							.map((f) => `${f.field} (${typeof f.value})`)
							.join(", ")}. Check Appwrite Console.`;
					}
				} else if (nonStringArrayFields.length > 0) {
					fieldNames = `Possible issues: ${nonStringArrayFields
						.map((f) => `${f.field} (array)`)
						.join(", ")}. Check Appwrite Console for relationship attributes.`;
				} else if (allArrayFields.length > 0) {
					// All array fields are valid string arrays, so no issue here
					fieldNames =
						"No relationship fields are arrays. The validation error might be due to another reason. Check Appwrite Console.";
				} else if (contractFetchError) {
					fieldNames = `Could not fetch contract document. Error: ${contractFetchError}. Check Appwrite Console manually for contract ID: ${fileId}`;
				} else {
					fieldNames =
						"unknown - check all relationship fields in Appwrite Console. See server logs for full contract structure.";
				}

				throw new Error(
					`Cannot update contract status: relationship fields are stored as arrays instead of single values. ` +
						`Problematic fields: ${fieldNames}. ` +
						`Please fix these fields in the Appwrite Console before updating the status. ` +
						`Contract ID: ${fileId}. ` +
						`Check server logs for full contract structure. ` +
						`Original error: ${updateError?.message || "Unknown error"}`,
				);
			}

			// Re-throw other errors as-is
			throw updateError;
		}
	} catch (error) {
		handleError(error, "Failed to update contract status");
	}
};

export const getContracts = async () => {
	const { tablesDB } = await createAdminClient();
	try {
		const currentUser = await getCurrentUser();
		if (!currentUser) {
			console.error("getCurrentUser returned null/undefined in getContracts");
			return parseStringify({ documents: [], total: 0 });
		}
		// Fetch contracts where file owner matches current user
		// (Assumes you want contracts for the user's files)
		const contracts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
		});
		return parseStringify(contracts);
	} catch (error) {
		handleError(error, "Failed to get contracts");
	}
};

// Get contracts assigned to a specific manager
export const getContractsForManager = async (managerAccountId: string) => {
	const { tablesDB } = await createAdminClient();
	try {
		// Fetch contracts where the manager's accountId is in the assignedManagers array
		const contracts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			queries: [Query.search("assignedManagers", managerAccountId)],
		});
		return parseStringify(contracts.rows);
	} catch (error) {
		handleError(error, "Failed to get contracts for manager");
	}
};

export const getTotalContractsCount = async () => {
	try {
		const { tablesDB } = await createAdminClient();
		const contracts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
		});
		return contracts.total;
	} catch (error: any) {
		console.error("Failed to fetch total contracts count:", error);

		// Return 0 in test/CI environments when Appwrite fails
		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			error?.isTestConfig ||
			error?.code === "TEST_CONFIG" ||
			error?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			error?.message?.includes("AppwriteException")
		) {
			return 0;
		}

		return 0;
	}
};

export const getExpiringContractsCount = async () => {
	try {
		const { tablesDB } = await createAdminClient();
		const thirtyDaysFromNow = new Date();
		thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

		const contracts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			queries: [
				Query.lessThanEqual(
					"contractExpiryDate",
					thirtyDaysFromNow.toISOString().split("T")[0],
				),
				Query.greaterThan(
					"contractExpiryDate",
					new Date().toISOString().split("T")[0],
				),
			],
		});
		return contracts.total;
	} catch (error: any) {
		console.error("Failed to fetch expiring contracts count:", error);

		// Return 0 in test/CI environments when Appwrite fails
		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			error?.isTestConfig ||
			error?.code === "TEST_CONFIG" ||
			error?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			error?.message?.includes("AppwriteException")
		) {
			return 0;
		}

		return 0;
	}
};

// Get contracts filtered by user's division
export const getContractsByUserDivision = async (userDivision: string) => {
	const { tablesDB } = await createAdminClient();
	try {
		// Get all contracts
		const contracts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
		});

		// Filter contracts where assigned managers belong to the user's division
		const filteredContracts = [];

		for (const contract of contracts.rows) {
			if (
				contract.assignedManagers &&
				Array.isArray(contract.assignedManagers)
			) {
				// Check if any assigned manager belongs to the user's division
				for (const managerName of contract.assignedManagers) {
					// Get manager by name to check their division using new RBAC system
					const { getUsersByRoleNames } = await import(
						"@/lib/utils/get-users-by-role"
					);
					const allManagers = await getUsersByRoleNames([
						"Department Manager",
						"manager",
					]);
					const managers = {
						rows: allManagers.filter((m: any) => m.fullName === managerName),
					};

					if (managers.rows.length > 0) {
						const manager = managers.rows[0];
						if (manager.division === userDivision) {
							filteredContracts.push(contract);
							break; // Found a manager from this division, no need to check others
						}
					}
				}
			}
		}

		return parseStringify(filteredContracts);
	} catch (error) {
		console.error("Failed to get contracts by user division:", error);
		return [];
	}
};

/**
 * Update contract expiry date
 * Handles both contract and file documents
 */
export const updateContractExpiryDate = async (
	documentId: string,
	expiryDate: string,
) => {
	const { tablesDB } = await createAdminClient();

	try {
		// Ensure expiryDate is in YYYY-MM-DD format
		// Parse the date string to extract just the date part (in case it includes time)
		const dateOnlyMatch = expiryDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (!dateOnlyMatch) {
			throw new Error(
				`Invalid date format: ${expiryDate}. Expected YYYY-MM-DD format.`,
			);
		}

		// Extract date components
		const [, year, month, day] = dateOnlyMatch;

		// Create a date at noon UTC to avoid timezone shifts when Appwrite converts it
		// Using noon instead of midnight prevents day shifts due to timezone conversions
		const dateAtNoonUTC = new Date(
			Date.UTC(
				parseInt(year, 10),
				parseInt(month, 10) - 1, // Month is 0-indexed
				parseInt(day, 10),
				12, // Noon UTC
				0,
				0,
				0,
			),
		);

		// Format as ISO string - this will be "YYYY-MM-DDTHH:mm:ss.sssZ"
		// Appwrite will store this, and when we read it back, we'll extract just the date part
		const expiryDateISO = dateAtNoonUTC.toISOString();

		console.log("Updating contract expiry date:", {
			documentId,
			originalExpiryDate: expiryDate,
			dateOnlyMatch,
			year,
			month,
			day,
			dateAtNoonUTC: dateAtNoonUTC.toISOString(),
			expiryDateISO,
			databaseId: appwriteConfig.databaseId,
			contractsTableId: appwriteConfig.contractsCollectionId,
		});

		// First, try to update directly in contracts collection (most common case)
		try {
			// Get the current document first to verify it exists
			const currentContract = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: documentId,
			});

			console.log("📋 Current contract before update:", {
				contractId: documentId,
				currentExpiryDate: currentContract?.contractExpiryDate,
				$updatedAt: currentContract?.$updatedAt,
			});

			// Calculate daysUntilExpiry based on the new expiry date
			const expiryStr = expiryDate.split("T")[0];
			const [year, month, day] = expiryStr.split("-").map(Number);
			const expiryDateObj = new Date(year, month - 1, day);
			expiryDateObj.setHours(0, 0, 0, 0);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const timeDiff = expiryDateObj.getTime() - today.getTime();
			const daysUntilExpiry = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

			// Perform the update - send as ISO string with noon UTC to prevent timezone shifts
			console.log("🔄 Calling updateRow with:", {
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.contractsCollectionId,
				rowId: documentId,
				data: {
					contractExpiryDate: expiryDateISO,
					daysUntilExpiry,
				},
			});

			let updatedContract;
			try {
				updatedContract = await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: documentId,
					data: {
						contractExpiryDate: expiryDateISO,
						daysUntilExpiry,
					},
				});
			} catch (updateError: any) {
				console.error("❌ updateRow threw an error:", {
					error: updateError,
					message: updateError?.message,
					code: updateError?.code,
					type: updateError?.type,
					response: updateError?.response,
				});
				throw updateError;
			}

			console.log("✅ Contract document updateRow call completed:", {
				contractId: documentId,
				expiryDate: updatedContract?.contractExpiryDate,
				$updatedAt: updatedContract?.$updatedAt,
				hasResponse: !!updatedContract,
				responseKeys: updatedContract ? Object.keys(updatedContract) : [],
			});

			// Verify the update by reading the document back after a short delay
			// This ensures the database has time to commit the transaction
			await new Promise((resolve) => setTimeout(resolve, 100));

			try {
				const verifyContract = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: documentId,
				});

				const savedDate = verifyContract?.contractExpiryDate;
				// Normalize dates for comparison - handle both YYYY-MM-DD and ISO datetime formats
				const normalizeDate = (
					dateStr: string | null | undefined,
				): string | null => {
					if (!dateStr) return null;
					// Extract just the date part (YYYY-MM-DD)
					return dateStr.split("T")[0].split(" ")[0];
				};

				// Compare using the original date-only string (YYYY-MM-DD) that was passed in
				const normalizedSaved = normalizeDate(savedDate);
				const normalizedExpected = normalizeDate(expiryDate); // Use original expiryDate (YYYY-MM-DD), not expiryDateISO

				console.log("🔍 Verification - Read contract back from database:", {
					contractId: documentId,
					expectedDate: expiryDate, // Original YYYY-MM-DD format
					expiryDateISO, // ISO string we sent
					savedDate: savedDate,
					normalizedExpected,
					normalizedSaved,
					match: normalizedSaved === normalizedExpected,
					fullContract: verifyContract,
				});

				if (!normalizedSaved) {
					console.error(
						"❌ Verification failed - No date found in saved contract!",
						{
							expected: expiryDate,
							saved: savedDate,
							contract: verifyContract,
						},
					);
					throw new Error(
						`Date verification failed: No contractExpiryDate found in saved document`,
					);
				}

				if (normalizedSaved !== normalizedExpected) {
					console.error("❌ Verification failed - Date mismatch!", {
						expected: expiryDate,
						normalizedExpected,
						saved: savedDate,
						normalizedSaved,
					});
					// Don't throw - log the mismatch but continue, as the update might still have worked
					// Appwrite might store dates in a different format but the date itself is correct
					console.warn(
						"⚠️ Date format mismatch detected, but date may still be correct",
					);
				} else {
					console.log(
						"✅ Verification passed - Date correctly saved to database",
					);
				}
			} catch (verifyError: any) {
				console.error("⚠️ Verification read failed (non-blocking):", {
					error: verifyError?.message,
					code: verifyError?.code,
					type: verifyError?.type,
				});
				// Don't throw - the update might have succeeded even if verification fails
			}

			return { success: true };
		} catch (contractError: any) {
			// If not found in contracts, try to find the contract via files collection
			console.log(
				"Document not found in contracts collection, trying files collection...",
			);

			try {
				// Get the file document to find the contract ID
				const fileDoc = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.filesCollectionId!,
					rowId: documentId,
				});

				const contractId = (fileDoc as any).contractId;

				if (!contractId) {
					throw new Error("File document does not have a contractId field");
				}

				// Update the contract document
				const updatedContract = await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					rowId: contractId,
					data: { contractExpiryDate: expiryDate },
				});

				console.log(
					"✅ Contract document updated successfully via file lookup:",
					{
						fileId: documentId,
						contractId,
						expiryDate: updatedContract?.contractExpiryDate,
					},
				);

				// Also update the file document if it has the field
				try {
					await tablesDB.updateRow({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.filesCollectionId!,
						rowId: documentId,
						data: { contractExpiryDate: expiryDate },
					});
					console.log("✅ File document also updated successfully");
				} catch (fileUpdateError: any) {
					console.warn(
						"⚠️ Failed to update file document (non-blocking):",
						fileUpdateError,
					);
				}

				return { success: true };
			} catch (fileError: any) {
				console.error("Failed to find or update via files collection:", {
					documentId,
					contractError: contractError?.message,
					fileError: fileError?.message,
					contractErrorCode: contractError?.code,
					fileErrorCode: fileError?.code,
				});
				throw new Error(
					`Failed to update contract expiry date: Document not found in contracts or files collection. ${contractError?.message || fileError?.message}`,
				);
			}
		}
	} catch (error: any) {
		console.error("Failed to update contract expiry date:", {
			documentId,
			expiryDate,
			error: error?.message,
			code: error?.code,
			type: error?.type,
			response: error?.response,
		});
		throw error;
	}
};

/**
 * Update contract ownership / classification fields from preview sheet
 */
export const updateContractPreviewFields = async (
	documentId: string,
	fields: {
		department?: string;
		contractType?: string;
		status?: string;
	},
) => {
	const { tablesDB } = await createAdminClient();

	const data = Object.fromEntries(
		Object.entries(fields).filter(
			([, value]) => value !== undefined && value !== null && value !== "",
		),
	);

	if (Object.keys(data).length === 0) {
		return { success: true };
	}

	try {
		await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			rowId: documentId,
			data,
		});
		return { success: true };
	} catch (contractError: unknown) {
		try {
			const fileDoc = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.filesCollectionId!,
				rowId: documentId,
			});

			const contractId = (fileDoc as { contractId?: string }).contractId;
			if (!contractId) {
				throw contractError;
			}

			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: contractId,
				data,
			});

			return { success: true };
		} catch {
			const message =
				contractError instanceof Error
					? contractError.message
					: "Failed to update contract fields";
			throw new Error(message);
		}
	}
};
