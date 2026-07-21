/**
 * Hook for managing contract upload drafts
 * Handles auto-save, loading, resuming, and deleting drafts
 */

import { useCallback, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import type { ContractFormData } from "../schema";
import type { Draft, ProcessedFileData } from "../types";

interface UseDraftManagementProps {
	ownerId: string;
	accountId: string;
	currentStep: number;
	totalSteps: number;
	form: UseFormReturn<ContractFormData>;
	processedFileData: ProcessedFileData | null;
	extractedData: Record<string, unknown> | null;
	setProcessedFileData: (data: ProcessedFileData | null) => void;
	setExtractedData: (data: Record<string, unknown> | null) => void;
	setCurrentStep: (step: number) => void;
	setIsOpen: (open: boolean) => void;
	resetForm: () => void;
}

export function useDraftManagement({
	ownerId,
	accountId,
	currentStep,
	totalSteps,
	form,
	processedFileData,
	extractedData,
	setProcessedFileData,
	setExtractedData,
	setCurrentStep,
	setIsOpen,
	resetForm,
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
			return false; // Don't save while resuming a draft
		}
		// Don't save if no file data is available (required for all drafts)
		if (!processedFileData) {
			return false;
		}

		setIsSaving(true);
		let success = false;
		try {
			const formValues = form.getValues();
			const response = await fetch("/api/contracts/drafts", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					ownerId,
					accountId,
					formData: formValues,
					currentStep,
					processedFileData,
					extractedData,
					draftId: currentDraftId, // Pass draftId to update existing or create new
				}),
			});

			if (response.ok) {
				const result = await response.json();
				// Store the draft ID if this is a new draft
				if (result.draft?.$id && !currentDraftId) {
					setCurrentDraftId(result.draft.$id);
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
				console.error("Failed to save draft:", {
					status: response.status,
					statusText: response.statusText,
					error: errorData,
					url: response.url,
				});
				// Show error toast only if it's not a silent save (e.g., on dialog close)
				if (currentStep > 1) {
					toast({
						title: "Save failed",
						description:
							errorData.error || `Failed to save progress (${response.status})`,
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
			// Don't show error toast to avoid annoying the user during auto-save
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
		totalSteps,
		toast,
		currentDraftId,
	]);

	// Load saved drafts
	const loadSavedDrafts = useCallback(
		async (forceRefresh = false) => {
			try {
				// Add cache busting parameter if force refresh is requested
				const url = forceRefresh
					? `/api/contracts/drafts?ownerId=${ownerId}&_t=${Date.now()}`
					: `/api/contracts/drafts?ownerId=${ownerId}`;
				const response = await fetch(url);
				if (response.ok) {
					const data = await response.json();
					setSavedDrafts(data.drafts || []);
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
				// Set flag to prevent auto-save during resume
				isResumingDraftRef.current = true;

				// Parse form data if it's a string (should already be parsed from API, but safe check)
				let parsedFormData: string | Record<string, unknown> = draft.formData;
				if (typeof draft.formData === "string") {
					try {
						parsedFormData = JSON.parse(draft.formData);
					} catch {
						parsedFormData = {};
					}
				}

				// Prepare form values with proper date handling
				const formValues: Partial<ContractFormData> = { ...form.getValues() };
				if (parsedFormData) {
					Object.keys(parsedFormData).forEach((key) => {
						const value = (parsedFormData as any)[key];
						if (value !== undefined && value !== null) {
							// Handle date fields
							if (
								(key.includes("Date") || key === "expiryDate") &&
								typeof value === "string"
							) {
								const dateValue = new Date(value);
								if (!Number.isNaN(dateValue.getTime())) {
									formValues[key as keyof ContractFormData] = dateValue as any;
								}
							} else {
								formValues[key as keyof ContractFormData] = value as any;
							}
						}
					});
				}

				// Batch all updates at once using form.reset() to prevent multiple re-renders
				form.reset(formValues as ContractFormData);

				// Set file data and extracted data
				if (draft.processedFileData) {
					const parsed =
						typeof draft.processedFileData === "string"
							? JSON.parse(draft.processedFileData)
							: draft.processedFileData;
					setProcessedFileData(parsed);
				}
				if (draft.extractedData) {
					const parsed =
						typeof draft.extractedData === "string"
							? JSON.parse(draft.extractedData)
							: draft.extractedData;
					setExtractedData(parsed);
				}

				// Set current step
				setCurrentStep(draft.currentStep || 1);

				// Set the current draft ID so updates go to this draft
				setCurrentDraftId(draft.$id);

				// Open dialog
				setIsOpen(true);

				// Clear the resume flag after a delay to allow auto-save to resume
				setTimeout(() => {
					isResumingDraftRef.current = false;
				}, 3000); // 3 seconds should be enough for all updates to complete

				toast({
					title: "Draft resumed",
					description: `Continuing from step ${draft.currentStep} (${draft.progressPercentage}% complete)`,
				});
			} catch (error) {
				console.error("Error resuming draft:", error);
				isResumingDraftRef.current = false; // Clear flag on error
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
			setProcessedFileData,
			setExtractedData,
			setCurrentStep,
			setIsOpen,
		],
	);

	// Delete a draft
	const deleteDraft = useCallback(
		async (draftId: string) => {
			try {
				const response = await fetch(
					`/api/contracts/drafts?draftId=${draftId}&ownerId=${ownerId}`,
					{
						method: "DELETE",
					},
				);
				if (response.ok) {
					setSavedDrafts((prev) => prev.filter((d) => d.$id !== draftId));
					// If deleting the current draft, reset the draft ID
					if (currentDraftId === draftId) {
						setCurrentDraftId(null);
					}
					// Reload drafts to ensure cache is fresh
					await loadSavedDrafts();
					toast({
						title: "Draft deleted",
						description: "The draft has been deleted",
					});
				}
			} catch (error) {
				console.error("Error deleting draft:", error);
				toast({
					title: "Error",
					description: "Failed to delete draft",
					variant: "destructive",
				});
			}
		},
		[toast, currentDraftId, ownerId, loadSavedDrafts],
	);

	// Delete current draft on cancel
	const deleteDraftOnCancel = useCallback(async () => {
		if (currentDraftId) {
			try {
				const response = await fetch(
					`/api/contracts/drafts?draftId=${currentDraftId}`,
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
				// Continue with cancel even if delete fails
			}
		}
	}, [currentDraftId]);

	// Manual save and close
	const handleManualSave = useCallback(async () => {
		// Don't save if no file data is available
		if (!processedFileData) {
			toast({
				title: "No file uploaded",
				description: "Please upload a file first before saving",
				variant: "destructive",
			});
			return;
		}
		const success = await autoSaveDraft();
		// Close form after successful save
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
