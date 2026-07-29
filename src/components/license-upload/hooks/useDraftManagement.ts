/**
 * Hook for managing license upload drafts
 * Handles auto-save, loading, resuming, and deleting drafts
 */

import { useCallback, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import type { LicenseUploadFormData } from "../schema";
import type { Draft, ProcessedFileData } from "../types";

const DATE_KEYS = new Set([
	"licenseExpiryDate",
	"issueDate",
	"renewalDate",
]);

const STRING_KEYS = new Set([
	"quantity",
	"cost",
	"renewalNoticeDays",
	"licenseName",
	"licenseNumber",
	"licenseType",
	"category",
	"issuingAuthority",
	"vendor",
	"product",
	"description",
	"notes",
	"currencyCode",
	"division",
	"department",
	"subDepartment",
	"businessUnit",
]);

function toArrayBuffer(value: unknown): ArrayBuffer | null {
	if (!value) return null;
	if (value instanceof ArrayBuffer) return value;
	if (Array.isArray(value)) return new Uint8Array(value).buffer;
	if (typeof value === "object" && value !== null && "data" in value) {
		const data = (value as { data?: unknown }).data;
		if (Array.isArray(data)) return new Uint8Array(data).buffer;
	}
	return null;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

function parseMaybeJson<T>(value: unknown): T | null {
	if (value == null) return null;
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch {
			return null;
		}
	}
	if (typeof value === "object") return value as T;
	return null;
}

interface UseDraftManagementProps {
	ownerId: string;
	accountId: string;
	currentStep: number;
	totalSteps: number;
	form: UseFormReturn<LicenseUploadFormData>;
	processedFileData: ProcessedFileData | null;
	extractedData: Record<string, unknown> | null;
	isExtracting?: boolean;
	setProcessedFileData: (
		data: ProcessedFileData | null | ((prev: ProcessedFileData | null) => ProcessedFileData | null),
	) => void;
	setExtractedData: (data: Record<string, unknown> | null) => void;
	setCurrentStep: (step: number) => void;
	setIsOpen: (open: boolean) => void;
	resetForm: () => void;
	onRestoreExtraction?: (extracted: Record<string, unknown> | null) => void;
	onRestoreManagers?: (managerIds: string[]) => void;
}

export function useDraftManagement({
	ownerId,
	accountId,
	currentStep,
	totalSteps,
	form,
	processedFileData,
	extractedData,
	isExtracting = false,
	setProcessedFileData,
	setExtractedData,
	setCurrentStep,
	setIsOpen,
	resetForm,
	onRestoreExtraction,
	onRestoreManagers,
}: UseDraftManagementProps) {
	const { toast } = useToast();
	const [savedDrafts, setSavedDrafts] = useState<Draft[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
	const isResumingDraftRef = useRef(false);

	// Auto-save draft
	const autoSaveDraft = useCallback(async (): Promise<boolean> => {
		if (isResumingDraftRef.current) {
			return false;
		}
		if (isExtracting) {
			return false;
		}
		if (!processedFileData) {
			return false;
		}

		setIsSaving(true);
		let success = false;
		try {
			const formValues = form.getValues();
			// ArrayBuffer does not survive JSON — send base64 until we have bucketFileId
			const filePayload = processedFileData.bucketFileId
				? {
						name: processedFileData.name,
						type: processedFileData.type,
						size: processedFileData.size,
						lastModified: processedFileData.lastModified,
						bucketFileId: processedFileData.bucketFileId,
					}
				: {
						name: processedFileData.name,
						type: processedFileData.type,
						size: processedFileData.size,
						lastModified: processedFileData.lastModified,
						base64Content: processedFileData.base64Content,
						bucketFileId: null,
					};

			const response = await fetch("/api/licenses/drafts", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					ownerId,
					accountId,
					formData: formValues,
					currentStep,
					processedFileData: filePayload,
					extractedData,
					draftId: currentDraftId,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				const draft = result.data?.draft || result.draft;
				if (draft?.$id) {
					setCurrentDraftId(draft.$id);
				}
				const savedFile = parseMaybeJson<{ bucketFileId?: string }>(
					draft?.processedFileData,
				);
				if (savedFile?.bucketFileId) {
					setProcessedFileData((prev) => {
						if (!prev || prev.bucketFileId === savedFile.bucketFileId) {
							return prev;
						}
						return { ...prev, bucketFileId: savedFile.bucketFileId };
					});
				}
				setLastSavedAt(new Date());
				toast({
					title: "Progress saved",
					description: `Your progress has been saved (${Math.round(
						(currentStep / totalSteps) * 100,
					)}% complete)`,
					duration: 2000,
				});
				success = true;
			} else {
				const errorText = await response.text();
				let errorData;
				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = { error: errorText || "Unknown error" };
				}

				const errorMessage =
					errorData.error ||
					errorData.message ||
					errorData.data?.error ||
					`Failed to save progress (${response.status})`;

				console.error("Failed to save draft:", {
					status: response.status,
					statusText: response.statusText,
					error: errorData,
					errorMessage,
					url: response.url,
				});
				if (currentStep > 1) {
					toast({
						title: "Save failed",
						description: errorMessage,
						variant: "destructive",
						duration: 3000,
					});
				}
				success = false;
			}
		} catch (error: any) {
			console.error("Error auto-saving draft:", {
				message: error?.message,
				stack: error?.stack,
				name: error?.name,
				error: error,
			});
			success = false;
		} finally {
			setIsSaving(false);
		}
		return success;
	}, [
		currentStep,
		form,
		ownerId,
		accountId,
		processedFileData,
		extractedData,
		isExtracting,
		totalSteps,
		toast,
		currentDraftId,
		setProcessedFileData,
	]);

	// Load saved drafts
	const loadSavedDrafts = useCallback(
		async (forceRefresh = false) => {
			try {
				const url = forceRefresh
					? `/api/licenses/drafts?ownerId=${ownerId}&_t=${Date.now()}`
					: `/api/licenses/drafts?ownerId=${ownerId}`;
				const response = await fetch(url);
				if (response.ok) {
					const result = await response.json();
					const drafts = result.data?.drafts || result.drafts || [];
					setSavedDrafts(drafts);
				}
			} catch (error) {
				console.error("Error loading saved drafts:", error);
			}
		},
		[ownerId],
	);

	// Resume a draft
	const resumeDraft = useCallback(
		async (draft: Draft) => {
			try {
				isResumingDraftRef.current = true;

				const parsedFormData =
					parseMaybeJson<Record<string, unknown>>(draft.formData) || {};
				const parsedFile = parseMaybeJson<ProcessedFileData & { bucketFileId?: string | null }>(
					draft.processedFileData,
				);
				const parsedExtracted = parseMaybeJson<Record<string, unknown>>(
					draft.extractedData,
				);

				const savedStep = Math.max(1, Number(draft.currentStep) || 1);
				// Step 1 is done once a file exists — jump to details so Resume feels real
				const targetStep = Math.min(
					totalSteps,
					Math.max(savedStep, parsedFile ? 2 : 1),
				);

				setCurrentDraftId(draft.$id);
				setCurrentStep(targetStep);
				setIsOpen(true);

				const formValues: Partial<LicenseUploadFormData> = {
					...form.getValues(),
				};

				Object.keys(parsedFormData).forEach((key) => {
					const value = parsedFormData[key];
					if (value === undefined || value === null) return;

					if (DATE_KEYS.has(key) || key.includes("Date")) {
						if (typeof value === "string" || typeof value === "number") {
							const dateValue = new Date(value);
							if (!Number.isNaN(dateValue.getTime())) {
								formValues[key as keyof LicenseUploadFormData] =
									dateValue as never;
							}
						} else if (value instanceof Date) {
							formValues[key as keyof LicenseUploadFormData] =
								value as never;
						}
						return;
					}

					if (STRING_KEYS.has(key) && typeof value === "number") {
						formValues[key as keyof LicenseUploadFormData] = String(
							value,
						) as never;
						return;
					}

					formValues[key as keyof LicenseUploadFormData] = value as never;
				});

				form.reset(formValues as LicenseUploadFormData);

				const managerIds = Array.isArray(formValues.assignedManagers)
					? formValues.assignedManagers.filter(
							(id): id is string => typeof id === "string",
						)
					: [];
				onRestoreManagers?.(managerIds);

				if (parsedFile) {
					const fromBase64 =
						typeof parsedFile.base64Content === "string" &&
						parsedFile.base64Content.length > 0
							? base64ToArrayBuffer(parsedFile.base64Content)
							: null;
					const fromBuffer = toArrayBuffer(parsedFile.arrayBuffer);
					let restored: ProcessedFileData = {
						name: parsedFile.name,
						type: parsedFile.type,
						size: parsedFile.size,
						lastModified: parsedFile.lastModified,
						base64Content: parsedFile.base64Content || "",
						arrayBuffer: fromBase64 || fromBuffer || new ArrayBuffer(0),
						bucketFileId: parsedFile.bucketFileId || null,
					};

					setProcessedFileData(restored);

					if (
						!(fromBase64 || fromBuffer) &&
						parsedFile.bucketFileId
					) {
						try {
							const fileRes = await fetch(
								"/api/licenses/drafts/fetch-file",
								{
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										bucketFileId: parsedFile.bucketFileId,
									}),
								},
							);
							if (fileRes.ok) {
								const fileJson = await fileRes.json();
								const file = fileJson.data?.file || fileJson.file;
								const fetched = toArrayBuffer(file?.arrayBuffer);
								if (fetched) {
									const bytes = new Uint8Array(fetched);
									let binary = "";
									for (let i = 0; i < bytes.length; i++) {
										binary += String.fromCharCode(bytes[i]);
									}
									restored = {
										...restored,
										arrayBuffer: fetched,
										base64Content: btoa(binary),
										bucketFileId: parsedFile.bucketFileId,
									};
									setProcessedFileData(restored);
								}
							}
						} catch (fileError) {
							console.error(
								"Failed to restore draft file bytes:",
								fileError,
							);
						}
					} else if (!(fromBase64 || fromBuffer)) {
						toast({
							title: "File missing from draft",
							description:
								"Re-upload the license file on step 1, then continue. Form fields were restored when available.",
							variant: "destructive",
							duration: 5000,
						});
					}
				}

				setExtractedData(parsedExtracted);
				onRestoreExtraction?.(parsedExtracted);

				setTimeout(() => {
					isResumingDraftRef.current = false;
				}, 3000);

				toast({
					title: "Draft resumed",
					description: `Continuing from step ${targetStep}${
						draft.progressPercentage != null
							? ` (${draft.progressPercentage}% complete)`
							: ""
					}`,
				});
			} catch (error) {
				console.error("Error resuming draft:", error);
				isResumingDraftRef.current = false;
				toast({
					title: "Error",
					description: "Failed to resume draft",
					variant: "destructive",
				});
			}
		},
		[
			form,
			toast,
			totalSteps,
			setProcessedFileData,
			setExtractedData,
			setCurrentStep,
			setIsOpen,
			onRestoreExtraction,
			onRestoreManagers,
		],
	);

	// Delete a draft
	const deleteDraft = useCallback(
		async (draftId: string) => {
			// Remove from UI immediately (optimistic)
			setSavedDrafts((prev) => prev.filter((d) => d.$id !== draftId));
			if (currentDraftId === draftId) {
				setCurrentDraftId(null);
			}

			try {
				const response = await fetch(
					`/api/licenses/drafts?draftId=${encodeURIComponent(draftId)}&ownerId=${encodeURIComponent(ownerId)}`,
					{
						method: "DELETE",
					},
				);
				if (!response.ok) {
					const errorText = await response.text();
					console.error("Failed to delete draft:", response.status, errorText);
					await loadSavedDrafts(true);
					toast({
						title: "Error",
						description: "Failed to delete draft",
						variant: "destructive",
					});
					return false;
				}

				// Refresh from server, but keep this id out if listing is briefly stale
				await loadSavedDrafts(true);
				setSavedDrafts((prev) => prev.filter((d) => d.$id !== draftId));

				toast({
					title: "Draft deleted",
					description: "The draft has been deleted",
				});
				return true;
			} catch (error) {
				console.error("Error deleting draft:", error);
				await loadSavedDrafts(true);
				toast({
					title: "Error",
					description: "Failed to delete draft",
					variant: "destructive",
				});
				return false;
			}
		},
		[toast, currentDraftId, ownerId, loadSavedDrafts],
	);

	// Delete current draft on cancel
	const deleteDraftOnCancel = useCallback(async () => {
		if (currentDraftId) {
			try {
				const response = await fetch(
					`/api/licenses/drafts?draftId=${currentDraftId}`,
					{
						method: "DELETE",
					},
				);
				if (response.ok) {
					setSavedDrafts((prev) =>
						prev.filter((d) => d.$id !== currentDraftId),
					);
				}
			} catch (error) {
				console.error("Error deleting draft on cancel:", error);
			}
		}
	}, [currentDraftId]);

	// Manual save and close
	const handleManualSave = useCallback(async () => {
		if (!processedFileData) {
			toast({
				title: "No file uploaded",
				description: "Please upload a file first before saving",
				variant: "destructive",
			});
			return;
		}
		const success = await autoSaveDraft();
		if (success) {
			setIsOpen(false);
			resetForm();
		}
	}, [autoSaveDraft, processedFileData, toast, setIsOpen, resetForm]);

	return {
		savedDrafts,
		setSavedDrafts,
		isSaving,
		lastSavedAt,
		currentDraftId,
		setCurrentDraftId,
		isResumingDraftRef,
		autoSaveDraft,
		loadSavedDrafts,
		resumeDraft,
		deleteDraft,
		deleteDraftOnCancel,
		handleManualSave,
	};
}
