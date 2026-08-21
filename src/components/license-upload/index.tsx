/**
 * License Upload Form - Main Component
 * Lazy-loaded with deferred data fetching for optimal performance
 */

"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	AlertTriangle,
	Ban,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AiExtractionReviewPanel,
	AiExtractionStatusBadge,
} from "@/components/contract-upload/AiExtractionReview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/actions/file.actions";
import {
	buildFormPatchFromLicenseExtraction,
	isRealLicenseExtractionMethod,
	parseLicenseExtractionJson,
} from "@/lib/ai/licenseExtractionSchema";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
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

const LicenseReviewStep = dynamic(() => import("./steps/LicenseReviewStep"), {
	loading: () => (
		<div className="flex justify-center p-8">
			<Loader2 className="animate-spin" />
		</div>
	),
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
	/** Step 1 file ingest: progress bar → brief check → hide */
	const [fileIngestUi, setFileIngestUi] = useState<
		"hidden" | "progress" | "success"
	>("hidden");
	const [fileIngestProgress, setFileIngestProgress] = useState(0);
	const fileIngestSuccessTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const [extractionMethod, setExtractionMethod] = useState<string | null>(null);
	const [aiFilledFields, setAiFilledFields] = useState<string[]>([]);
	const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);
	const [fieldConfidence, setFieldConfidence] = useState<
		Record<string, number>
	>({});
	const [overallExtractionConfidence, setOverallExtractionConfidence] =
		useState<number | null>(null);
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
		setFileIngestUi("hidden");
		setFileIngestProgress(0);
		if (fileIngestSuccessTimeoutRef.current) {
			clearTimeout(fileIngestSuccessTimeoutRef.current);
			fileIngestSuccessTimeoutRef.current = null;
		}
		setExtractionMethod(null);
		setAiFilledFields([]);
		setLowConfidenceFields([]);
		setFieldConfidence({});
		setOverallExtractionConfidence(null);
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
		isExtracting,
		setProcessedFileData,
		setExtractedData,
		setCurrentStep,
		setIsOpen,
		resetForm,
		onRestoreManagers: setSelectedManagers,
		onRestoreExtraction: (extracted) => {
			if (!extracted) {
				setExtractionMethod(null);
				setAiFilledFields([]);
				setLowConfidenceFields([]);
				setFieldConfidence({});
				setOverallExtractionConfidence(null);
				return;
			}
			const method = String(extracted.method || "");
			setExtractionMethod(method || null);
			const filled = Array.isArray(extracted.filledFieldNames)
				? (extracted.filledFieldNames as string[])
				: [];
			const low = Array.isArray(extracted.lowConfidenceFields)
				? (extracted.lowConfidenceFields as string[])
				: [];
			const conf =
				extracted.fieldConfidence &&
				typeof extracted.fieldConfidence === "object"
					? (extracted.fieldConfidence as Record<string, number>)
					: {};
			setAiFilledFields(filled);
			setLowConfidenceFields(low);
			setFieldConfidence(conf);
			setOverallExtractionConfidence(
				typeof extracted.overallConfidence === "number"
					? extracted.overallConfidence
					: null,
			);
		},
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
			if (currentStep === 2) {
				form.setValue("status", "pending-review");
			}
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

				if (fileIngestSuccessTimeoutRef.current) {
					clearTimeout(fileIngestSuccessTimeoutRef.current);
					fileIngestSuccessTimeoutRef.current = null;
				}

				try {
					// Reset draft ID - each file upload creates a new draft
					setCurrentDraftId(null);
					setFileIngestUi("progress");
					setFileIngestProgress(0);

					// Process file synchronously and cache all data (0–40%)
					const processedData = await processFileSynchronously(
						file,
						(readPct) => {
							setFileIngestProgress(Math.round(readPct * 0.4));
						},
					);
					setProcessedFileData(processedData);
					setFileIngestProgress(40);

					// Auto-extract data (40–95%)
					setIsExtracting(true);
					let extractPct = 40;
					const extractTick = setInterval(() => {
						extractPct = Math.min(extractPct + 2, 92);
						setFileIngestProgress(extractPct);
					}, 180);

					try {
						const extracted = await extractLicenseData(processedData);
						setExtractedData(extracted);

						if (extracted) {
							const method = String(extracted.method || "");
							setExtractionMethod(method);

							const parsed = parseLicenseExtractionJson(
								JSON.stringify(extracted),
							);
							const patch = buildFormPatchFromLicenseExtraction(
								parsed,
								file.name,
							);

							const filledFromApi = Array.isArray(extracted.filledFieldNames)
								? (extracted.filledFieldNames as string[])
								: parsed.filledFieldNames;
							const lowFromApi = Array.isArray(extracted.lowConfidenceFields)
								? (extracted.lowConfidenceFields as string[])
								: parsed.lowConfidenceFields;
							const confMap =
								(extracted.fieldConfidence as Record<string, number>) ||
								parsed.fieldConfidence;

							if (isRealLicenseExtractionMethod(method)) {
								setAiFilledFields(filledFromApi);
								setLowConfidenceFields(lowFromApi);
								setFieldConfidence(confMap);
								setOverallExtractionConfidence(
									typeof extracted.overallConfidence === "number"
										? (extracted.overallConfidence as number)
										: parsed.overallConfidence,
								);
								form.reset({
									...form.getValues(),
									...patch,
								});
							} else {
								setExtractedData(null);
								setExtractionMethod(null);
								setAiFilledFields([]);
								setLowConfidenceFields([]);
								setFieldConfidence({});
								setOverallExtractionConfidence(null);
							}
						}
					} catch (error) {
						console.error("Failed to extract license data:", error);
					} finally {
						clearInterval(extractTick);
						setIsExtracting(false);
						setFileIngestProgress(100);
						setFileIngestUi("success");
						fileIngestSuccessTimeoutRef.current = setTimeout(() => {
							setFileIngestUi("hidden");
							setFileIngestProgress(0);
							fileIngestSuccessTimeoutRef.current = null;
						}, 1600);
					}
				} catch (error) {
					console.error("File processing failed:", error);
					setFileIngestUi("hidden");
					setFileIngestProgress(0);
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

	useEffect(() => {
		return () => {
			if (fileIngestSuccessTimeoutRef.current) {
				clearTimeout(fileIngestSuccessTimeoutRef.current);
			}
		};
	}, []);

	// Step validation - defines required fields for each step
	const getRequiredFieldsForStep = (step: number): string[] => {
		switch (step) {
			case 1:
				return [];
			case 2:
				return [
					"licenseName",
					"licenseType",
					"licenseExpiryDate",
					"issuingAuthority",
				];
			case 3:
				return [];
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
					// Document uploads always start in review (same as contracts)
					status: "pending-review",
					licenseExpiryDate: values.licenseExpiryDate?.toISOString(),
					issueDate: values.issueDate?.toISOString(),
					renewalDate: values.renewalDate?.toISOString(),
					issuingAuthority:
						sanitizeString(values.issuingAuthority) ||
						sanitizeString(values.vendor) ||
						"Unknown",
					vendor: sanitizeString(values.vendor),
					product: sanitizeString(values.product),
					description: sanitizeString(values.description),
					notes: sanitizeString(values.notes),
					quantity: quantityAsNumber,
					cost: costAsNumber,
					currencyCode: values.currencyCode || "USD",
					division: sanitizeString(values.division),
					department: sanitizeString(values.department || values.division),
					subDepartment: sanitizeString(values.subDepartment),
					businessUnit: sanitizeString(values.businessUnit),
					compliance: values.compliance,
					assignedManagers: selectedManagers,
					autoRenew: values.autoRenew || false,
					renewalNoticeDays: parseIntegerInput(values.renewalNoticeDays),
				},
				draftId: currentDraftId || undefined,
			});

			await refreshStorageUsage(router);

			clearInterval(progressInterval);
			setUploadProgress(100);

			toast({
				title: "Submitted for Review",
				description: `${values.licenseName} was submitted as Pending Review. Approve it on Licenses → Approvals to activate.`,
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

	// Auto-save on step change (wait until OCR finishes so form/extracted data persist)
	useEffect(() => {
		if (isExtracting) return;
		if (currentStep > 1 || processedFileData) {
			const timeout = setTimeout(() => {
				autoSaveDraft();
			}, 2000);
			return () => clearTimeout(timeout);
		}
	}, [currentStep, autoSaveDraft, processedFileData, isExtracting]);

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
											<AiExtractionStatusBadge
												method={extractionMethod}
												overallConfidence={overallExtractionConfidence}
												filledCount={aiFilledFields.length}
											/>
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
								onSubmit={(e) => {
									// Only the explicit "Submit for Review" button may create a license
									e.preventDefault();
								}}
								onKeyDown={(e) => {
									// Prevent Enter from auto-submitting while editing fields
									if (
										e.key === "Enter" &&
										(e.target as HTMLElement).tagName !== "TEXTAREA"
									) {
										e.preventDefault();
									}
								}}
								className="space-y-6"
							>
								{/* Step 1: File Upload */}
								{currentStep === 1 && (
									<Step1FileUpload
										processedFileData={processedFileData}
										isExtracting={isExtracting}
										savedDrafts={savedDrafts}
										fileIngestUi={fileIngestUi}
										fileIngestProgress={fileIngestProgress}
										onDrop={onDrop}
										onResumeDraft={resumeDraft}
										onDeleteDraft={handleDeleteClick}
									/>
								)}

								{/* Step 2: License Details */}
								{currentStep === 2 && (
									<>
										<AiExtractionReviewPanel
											method={extractionMethod}
											overallConfidence={overallExtractionConfidence}
											filledCount={aiFilledFields.length}
											lowConfidenceFields={lowConfidenceFields}
										/>
										<Step2LicenseDetails
											form={form}
											departments={departments}
											filteredManagers={filteredManagers}
											selectedManagers={selectedManagers}
											setSelectedManagers={setSelectedManagers}
											fetchDepartmentManagers={fetchDepartmentManagers}
											aiFilledFields={aiFilledFields}
											fieldConfidence={fieldConfidence}
										/>
									</>
								)}

								{/* Step 3: Review before submit-for-review */}
								{currentStep === 3 && (
									<LicenseReviewStep
										values={form.watch() as Record<string, unknown>}
										fileName={processedFileData?.name}
										lowConfidenceFields={lowConfidenceFields}
										onEditStep={goToStep}
									/>
								)}

								{/* Save Progress Card — details step only (not final review) */}
								{currentStep === 2 && processedFileData && (
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
									type="button"
									onClick={() => void form.handleSubmit(handleSubmit)()}
									disabled={isUploading || !processedFileData}
									className="primary-btn min-w-[120px]"
								>
									{isUploading ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Submitting...
										</>
									) : (
										<>
											<Upload className="h-4 w-4" />
											Submit for Review
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

			{/* Delete Draft Dialog — matches ContractUploadForm Delete Draft */}
			<Dialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setDraftToDelete(null);
				}}
			>
				<DialogContent className="overflow-hidden p-0 gap-0 shadow-xl sm:max-w-md border border-slate-200" variant="destructive">
					<DialogTitle className="sr-only">Delete Draft</DialogTitle>
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Header */}
					<div className="px-6 py-4 mt-4 bg-white border-b border-slate-200">
						<div className="flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 shrink-0 text-[#f7d333]" />
							<h2 className="text-base font-semibold sidebar-gradient-text">
								Delete Draft
							</h2>
						</div>
						<DialogDescription className="text-sm text-slate-600 mt-1 ml-7">
							Are you sure you want to delete this draft? This action cannot be
							undone.
						</DialogDescription>
					</div>

					{/* Body */}
					<div className="px-6 py-5 space-y-3 bg-white">
						<p className="text-sm text-slate-600">
							Your decision to delete is irreversible, so please make sure you
							want to continue.
						</p>
						<p className="text-xs font-medium text-slate-500">
							This action is permanent.
						</p>
					</div>

					{/* Footer — centered actions */}
					<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-3">
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								setDeleteDialogOpen(false);
								setDraftToDelete(null);
							}}
							className="primary-btn gap-2 px-3 sm:px-4"
						>
							<Ban className="h-4 w-4 shrink-0" />
							Cancel
						</Button>
						<Button
							type="button"
							onClick={async () => {
								if (!draftToDelete) return;
								const id = draftToDelete;
								setDeleteDialogOpen(false);
								setDraftToDelete(null);
								await deleteDraft(id);
							}}
							className="primary-btn gap-2 px-3 sm:px-4"
						>
							<Trash2 className="h-4 w-4 shrink-0" />
							Delete Draft
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default LicenseUploadForm;
