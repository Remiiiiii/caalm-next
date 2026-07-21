/**
 * License Upload Form - Main Component
 * Lazy-loaded with deferred data fetching for optimal performance
 */

"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	AlertTriangle,
	Ban,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	FileCheck,
	Loader2,
	Trash2,
	Upload,
} from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/actions/file.actions";
import { STEP_TITLES, TOTAL_STEPS } from "./constants";
import { useDraftManagement } from "./hooks/useDraftManagement";
import { useLicenseForm } from "./hooks/useLicenseForm";
import { useManagers } from "./hooks/useManagers";
import type { LicenseUploadFormProps, ProcessedFileData } from "./types";
import { parseCurrencyInput, parseIntegerInput, sanitizeString } from "./utils";

// Lazy load components
const Step1FileUpload = dynamic(() => import("./steps/Step1FileUpload"), {
	loading: () => (
		<div className="flex justify-center p-8">
			<Loader2 className="animate-spin" />
		</div>
	),
	ssr: false,
});

const Step2LicenseDetails = dynamic(
	() => import("./steps/Step2LicenseDetails"),
	{
		loading: () => (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin" />
			</div>
		),
		ssr: false,
	},
);

const StepIndicator = dynamic(() => import("./components/StepIndicator"), {
	ssr: false,
});

const SaveProgressCard = dynamic(
	() => import("./components/SaveProgressCard"),
	{
		ssr: false,
	},
);

const CancelDialog = dynamic(() => import("./components/CancelDialog"), {
	ssr: false,
});

const LicenseUploadForm: React.FC<LicenseUploadFormProps> = ({
	ownerId,
	accountId,
	className,
	triggerLabel = "Upload License",
	onSuccess,
}) => {
	const _path = usePathname();
	const router = useRouter();
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [_uploadProgress, setUploadProgress] = useState(0);
	const [processedFileData, setProcessedFileData] =
		useState<ProcessedFileData | null>(null);
	const [extractedData, setExtractedData] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [isExtracting, setIsExtracting] = useState(false);
	const [currentStep, setCurrentStep] = useState(1);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
	const [isValidating, setIsValidating] = useState(false);

	// Initialize form
	const { form, processFileSynchronously, extractLicenseData } =
		useLicenseForm();

	// Initialize managers (deferred until dialog opens)
	const {
		availableManagers,
		filteredManagers,
		selectedManagers,
		setSelectedManagers,
		fetchDepartmentManagers,
	} = useManagers(isOpen);

	// Department options derived from the divisions of available managers.
	const departments = useMemo(
		() =>
			Array.from(
				new Set(
					availableManagers
						.map((manager) => manager.division)
						.filter((division): division is string => Boolean(division)),
				),
			).sort(),
		[availableManagers],
	);

	// Reset function
	const resetForm = useCallback(() => {
		form.reset();
		setProcessedFileData(null);
		setExtractedData(null);
		setIsExtracting(false);
		setSelectedManagers([]);
		setIsUploading(false);
		setUploadProgress(0);
		setCurrentStep(1);
	}, [form, setSelectedManagers]);

	// Initialize draft management
	const {
		savedDrafts,
		setSavedDrafts,
		isSaving,
		lastSavedAt,
		currentDraftId,
		setCurrentDraftId,
		autoSaveDraft,
		loadSavedDrafts,
		resumeDraft,
		deleteDraft,
		deleteDraftOnCancel,
		handleManualSave,
	} = useDraftManagement({
		ownerId,
		accountId,
		currentStep,
		totalSteps: TOTAL_STEPS,
		form,
		processedFileData,
		extractedData,
		setProcessedFileData,
		setExtractedData,
		setCurrentStep,
		setIsOpen,
		resetForm,
	});

	// Step navigation
	const nextStep = async () => {
		// Validate current step before proceeding
		setIsValidating(true);
		const isValid = await validateStep();
		setIsValidating(false);

		if (!isValid) {
			return; // Don't proceed if validation fails
		}

		if (currentStep < TOTAL_STEPS) {
			setCurrentStep((prev) => prev + 1);
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep((prev) => prev - 1);
		}
	};

	const goToStep = (step: number) => {
		if (step >= 1 && step <= TOTAL_STEPS) {
			setCurrentStep(step);
		}
	};

	// File drop handling
	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				const file = acceptedFiles[0];

				try {
					// Reset draft ID - each file upload creates a new draft
					setCurrentDraftId(null);

					// Process file synchronously and cache all data
					const processedData = await processFileSynchronously(file);
					setProcessedFileData(processedData);

					// Auto-extract data from license using cached data
					setIsExtracting(true);
					try {
						const extracted = await extractLicenseData(processedData);
						setExtractedData(extracted);

						// Pre-fill form with extracted data
						if (extracted) {
							form.reset({
								...form.getValues(),
								licenseName:
									(extracted.licenseName as string) ||
									file.name.replace(/\.[^/.]+$/, ""),
								licenseNumber: (extracted.licenseNumber as string) || "",
								licenseType:
									(extracted.licenseType as string) || "subscription",
								category: (extracted.category as string) || "saas",
								vendor: (extracted.vendor as string) || "",
								product: (extracted.product as string) || "",
								licenseExpiryDate: extracted.licenseExpiryDate
									? new Date(extracted.licenseExpiryDate as string)
									: undefined,
								issueDate: extracted.issueDate
									? new Date(extracted.issueDate as string)
									: undefined,
								cost: (extracted.cost as string) || "",
								quantity: (extracted.quantity as string) || "",
								description: (extracted.description as string) || "",
							});
						}
					} catch (error) {
						console.error("Failed to extract license data:", error);
					} finally {
						setIsExtracting(false);
					}
				} catch (error) {
					console.error("File processing failed:", error);
					toast({
						title: "File Processing Failed",
						description:
							"Failed to process the selected file. Please try again.",
						variant: "destructive",
					});
				}
			}
		},
		[
			form,
			processFileSynchronously,
			extractLicenseData,
			toast,
			setCurrentDraftId,
		],
	);

	// Step validation - defines required fields for each step
	const getRequiredFieldsForStep = (step: number): string[] => {
		switch (step) {
			case 1: // File Upload - file required
				return []; // Handled separately by processedFileData check
			case 2: // License Basics
				return ["licenseName", "licenseType", "status", "vendor", "product"];
			case 3: // License Details
				return ["issueDate", "licenseExpiryDate", "issuingAuthority"];
			case 4: // Financial Details
				return ["cost", "currencyCode", "quantity"];
			case 5: // Department & Ownership
				return ["division", "department", "assignedManager"];
			default:
				return [];
		}
	};

	// Validate current step before proceeding
	const validateStep = async (): Promise<boolean> => {
		const requiredFields = getRequiredFieldsForStep(currentStep);

		if (requiredFields.length === 0) {
			return true; // No required fields for this step
		}

		// Trigger validation for required fields only
		const result = await form.trigger(requiredFields as any);

		if (!result) {
			// Show error toast with specific missing fields
			const errors = form.formState.errors;
			const _missingFields = requiredFields.filter(
				(field) => errors[field as keyof typeof errors],
			);

			toast({
				title: "Required Fields Missing",
				description: `Please complete all required fields before proceeding to the next step.`,
				variant: "destructive",
			});
			return false;
		}

		return true;
	};

	// Handle form submission
	const handleSubmit = async (values: any) => {
		if (!processedFileData) {
			toast({
				title: "No File Selected",
				description: "Please select a license file to upload.",
				variant: "destructive",
			});
			return;
		}

		setIsUploading(true);
		setUploadProgress(0);

		try {
			// Simulate upload progress
			const progressInterval = setInterval(() => {
				setUploadProgress((prev) => {
					if (prev >= 90) {
						clearInterval(progressInterval);
						return 90;
					}
					return prev + 10;
				});
			}, 200);

			const costAsNumber = parseCurrencyInput(values.cost);
			const quantityAsNumber = parseIntegerInput(values.quantity);

			// Create File object from cached data for upload
			const fileForUpload = new File(
				[processedFileData.arrayBuffer],
				processedFileData.name,
				{
					type: processedFileData.type,
					lastModified: processedFileData.lastModified,
				},
			);

			// Upload file with license metadata
			await uploadFile({
				file: fileForUpload,
				ownerId,
				accountId,
				path: "/licenses",
				licenseMetadata: {
					licenseName: values.licenseName,
					licenseNumber: values.licenseNumber || `LIC-${Date.now()}`,
					licenseType: values.licenseType,
					category: values.category,
					status: values.status || "active",
					licenseExpiryDate: values.licenseExpiryDate?.toISOString(),
					issueDate: values.issueDate?.toISOString(),
					issuingAuthority: sanitizeString(values.issuingAuthority),
					vendor: sanitizeString(values.vendor),
					product: sanitizeString(values.product),
					description: sanitizeString(values.description),
					quantity: quantityAsNumber,
					cost: costAsNumber,
					currencyCode: values.currencyCode || "USD",
					division: sanitizeString(values.division),
					department: sanitizeString(values.department || values.division),
					assignedManagers: selectedManagers,
					autoRenew: values.autoRenew || false,
					renewalNoticeDays: parseIntegerInput(values.renewalNoticeDays),
				},
				draftId: currentDraftId || undefined,
			});

			clearInterval(progressInterval);
			setUploadProgress(100);

			toast({
				title: "License Uploaded Successfully",
				description: `${values.licenseName} has been uploaded and processed.`,
			});

			// Draft deletion is now handled automatically in uploadFile function
			// Just reload drafts to refresh the UI
			try {
				// Small delay to ensure server-side cache invalidation has completed
				await new Promise((resolve) => setTimeout(resolve, 300));
				await loadSavedDrafts(true);
				// Clear current draft ID since it should be deleted
				if (currentDraftId) {
					setCurrentDraftId(null);
					// Remove from local state immediately for better UX
					setSavedDrafts((prev) =>
						prev.filter((d) => d.$id !== currentDraftId),
					);
				}
			} catch (error) {
				console.error("Error reloading drafts after upload:", error);
				// Continue - license is already uploaded successfully
			}

			// Reset form
			resetForm();
			setIsOpen(false);

			// Route to licenses page after successful upload
			router.push("/licenses");

			onSuccess?.();
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: "There was an error uploading your license.";
			console.error("Upload failed:", error);
			toast({
				title: "Upload Failed",
				description: message,
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
		}
	};

	// Handle cancel confirmation
	const handleCancelConfirm = useCallback(async () => {
		await deleteDraftOnCancel();
		setIsOpen(false);
		resetForm();
		setCancelDialogOpen(false);
	}, [deleteDraftOnCancel, resetForm]);

	// Handle delete click
	const handleDeleteClick = useCallback((draftId: string) => {
		setDraftToDelete(draftId);
		setDeleteDialogOpen(true);
	}, []);

	// Auto-save on step change
	useEffect(() => {
		if (currentStep > 1 || processedFileData) {
			const timeout = setTimeout(() => {
				autoSaveDraft();
			}, 2000);
			return () => clearTimeout(timeout);
		}
	}, [currentStep, autoSaveDraft, processedFileData]);

	// Auto-save on dialog close
	useEffect(() => {
		if (!isOpen && processedFileData) {
			autoSaveDraft();
		}
	}, [isOpen, autoSaveDraft, processedFileData]);

	// Load drafts when dialog opens
	useEffect(() => {
		if (isOpen) {
			loadSavedDrafts();
		}
	}, [isOpen, loadSavedDrafts]);

	// Watch department changes
	const watchedDepartment = form.watch("department");
	useEffect(() => {
		if (watchedDepartment) {
			fetchDepartmentManagers(watchedDepartment);
		}
	}, [watchedDepartment, fetchDepartmentManagers]);

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button className={className}>
						<Upload className="h-4 w-4" />
						{triggerLabel}
					</Button>
				</DialogTrigger>

				<DialogContent className="glass-dialog">
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>Upload License</DialogTitle>
					</VisuallyHiddenPrimitive.Root>

					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Sticky Header */}
					<div className="glass-dialog-wizard-header">
						<div className="px-6 py-6">
							<div className="flex items-center gap-3 mb-3">
								<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
									<Upload className="w-5 h-5 text-[#0f5384]" />
								</div>
								<div className="flex-1">
									<h2 className="text-xl font-semibold sidebar-gradient-text">
										Upload New License
									</h2>
									<div className="flex items-center justify-between">
										<p className="text-sm text-slate-600 mt-0.5">
											Step {currentStep} of {TOTAL_STEPS}:{" "}
											{STEP_TITLES[currentStep - 1]}
										</p>
										<div className="flex items-center gap-2">
											{extractedData && (
												<Badge className=" sidebar-gradient-text border-sidebar-gradient-text">
													<CheckCircle className="h-3 w-3 mr-1 text-[#0f5384]" />
													Data extracted automatically
												</Badge>
											)}
											{isSaving && (
												<Badge
													variant="outline"
													className="text-xs sidebar-gradient-text"
												>
													<Loader2 className="h-3 w-3 mr-1 animate-spin" />
													Saving...
												</Badge>
											)}
											{lastSavedAt && !isSaving && (
												<Badge
													variant="outline"
													className="text-xs text-slate-600 border-slate-300"
												>
													<FileCheck className="h-3 w-3 mr-1 text-green" />
													Saved {(() => {
														const seconds = Math.round(
															(Date.now() - lastSavedAt.getTime()) / 1000,
														);
														if (seconds >= 60) {
															const minutes = Math.round(seconds / 60);
															return `${minutes} min ago`;
														}
														return `${seconds} s ago`;
													})()}
												</Badge>
											)}
										</div>
									</div>
								</div>
							</div>
							<StepIndicator
								currentStep={currentStep}
								onGoToStep={goToStep}
								processedFileData={processedFileData}
							/>
						</div>
					</div>

					{/* Scrollable Content */}
					<div className="glass-dialog-scroll-area">
						<Form {...form}>
							<form
								id="license-upload-form"
								onSubmit={form.handleSubmit(handleSubmit)}
								className="space-y-6"
							>
								{/* Step 1: File Upload */}
								{currentStep === 1 && (
									<Step1FileUpload
										processedFileData={processedFileData}
										isExtracting={isExtracting}
										savedDrafts={savedDrafts}
										onDrop={onDrop}
										onResumeDraft={resumeDraft}
										onDeleteDraft={handleDeleteClick}
									/>
								)}

								{/* Step 2: License Details */}
								{currentStep === 2 && (
									<Step2LicenseDetails
										form={form}
										departments={departments}
										filteredManagers={filteredManagers}
										selectedManagers={selectedManagers}
										setSelectedManagers={setSelectedManagers}
										fetchDepartmentManagers={fetchDepartmentManagers}
									/>
								)}

								{/* Save Progress Card */}
								{currentStep > 1 && processedFileData && (
									<SaveProgressCard
										onSave={handleManualSave}
										isSaving={isSaving}
									/>
								)}
							</form>
						</Form>
					</div>

					{/* Footer */}
					<div className="glass-dialog-footer-actions">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								if (currentStep > 1 || processedFileData) {
									setCancelDialogOpen(true);
								} else {
									setIsOpen(false);
									resetForm();
								}
							}}
							className="primary-btn flex items-center gap-2"
							disabled={isUploading}
						>
							<Ban className="h-4 w-4" />
							Cancel
						</Button>

						<div className="flex items-center gap-2">
							{currentStep > 1 && (
								<Button
									type="button"
									variant="outline"
									onClick={prevStep}
									disabled={isUploading}
									className="primary-btn sm:px-4 px-3 shimmer-hover"
								>
									<ChevronLeft className="h-4 w-4" />
									Previous
								</Button>
							)}

							{currentStep < TOTAL_STEPS ? (
								<Button
									type="button"
									onClick={nextStep}
									disabled={
										(currentStep === 1 && !processedFileData) || isValidating
									}
									className="primary-btn flex items-center gap-2"
								>
									{isValidating ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Validating...
										</>
									) : (
										<>
											Next
											<ChevronRight className="h-4 w-4" />
										</>
									)}
								</Button>
							) : (
								<Button
									type="submit"
									form="license-upload-form"
									disabled={isUploading || !processedFileData}
									className="primary-btn min-w-[120px]"
								>
									{isUploading ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Uploading...
										</>
									) : (
										<>
											<Upload className="h-4 w-4" />
											Upload License
										</>
									)}
								</Button>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Cancel Dialog */}
			<CancelDialog
				open={cancelDialogOpen}
				onOpenChange={setCancelDialogOpen}
				onConfirm={handleCancelConfirm}
			/>

			{/* Delete Draft Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent className="overflow-hidden p-0 shadow-xl sm:max-w-md">
					<AlertDialogTitle className="sr-only">Delete Draft</AlertDialogTitle>
					<div className="h-4 w-full bg-[#d6d7d8] opacity-70" />
					<div className="glass-dialog-alert-section">
						<div className="flex gap-2">
							<AlertTriangle className="w-5 h-5 text-[#f7d333]" />
							<h2 className="text-base font-semibold sidebar-gradient-text">
								Delete Draft
							</h2>
						</div>
						<AlertDialogDescription className="text-sm text-slate-600 mt-1 ml-7">
							Are you sure you want to delete this draft? This action cannot be
							undone.
						</AlertDialogDescription>
					</div>
					<div className="glass-dialog-alert-body">
						<p className="text-sm text-slate-600">
							Your decision to delete is irreversible, so please make sure you
							want to continue.
						</p>
					</div>
					<div className="glass-dialog-alert-footer">
						<div className="text-xs text-slate-500">
							This action is permanent.
						</div>
						<div className="flex items-center gap-3">
							<AlertDialogCancel
								onClick={() => {
									setDeleteDialogOpen(false);
									setDraftToDelete(null);
								}}
								className="primary-btn px-3 sm:px-4"
							>
								<Ban className="h-4 w-4" />
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={async () => {
									if (draftToDelete) {
										await deleteDraft(draftToDelete);
										setDraftToDelete(null);
										setDeleteDialogOpen(false);
									}
								}}
								className="primary-btn px-3 sm:px-4"
							>
								<Trash2 className="h-4 w-4" />
								Delete Draft
							</AlertDialogAction>
						</div>
					</div>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default LicenseUploadForm;
