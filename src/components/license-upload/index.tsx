/**
 * License Upload Form - Main Component
 * Lazy-loaded with deferred data fetching for optimal performance
 */

"use client";

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
import { AppDialog } from "@/components/ui/app-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/actions/file.actions";
import {
	buildFormPatchFromLicenseExtraction,
	isRealLicenseExtractionMethod,
	parseLicenseExtractionJson,
} from "@/lib/ai/licenseExtractionSchema";
import {
	AI_EXTRACTION_LIMIT_TITLE,
	isAiExtractionLimitError,
} from "@/lib/billing/aiExtractionUserMessages";
import {
	generateDocumentNumber,
	needsDocumentNumber,
} from "@/lib/contracts/documentNumber";
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
	const stepScrollRef = useRef<HTMLDivElement | null>(null);

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
		assigneeSource,
	} = useManagers(isOpen, { $id: ownerId, fullName: "You" });

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

	useEffect(() => {
		if (stepScrollRef.current) {
			stepScrollRef.current.scrollTop = 0;
		}
	}, [currentStep]);

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
								if (
									needsDocumentNumber(
										typeof patch.licenseNumber === "string"
											? patch.licenseNumber
											: form.getValues("licenseNumber"),
									)
								) {
									patch.licenseNumber = generateDocumentNumber("LIC");
								}
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
						toast({
							title: isAiExtractionLimitError(error)
								? AI_EXTRACTION_LIMIT_TITLE
								: "Could not auto-fill from file",
							description: isAiExtractionLimitError(error)
								? error.message
								: error instanceof Error
									? error.message
									: "You can still fill the form by hand.",
							variant: "destructive",
						});
					} finally {
						if (needsDocumentNumber(form.getValues("licenseNumber"))) {
							form.setValue("licenseNumber", generateDocumentNumber("LIC"), {
								shouldDirty: true,
							});
						}
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
					"department",
					"division",
					"assignedManagers",
				];
			case 3:
				return [];
			default:
				return [];
		}
	};

	// Validate current step before proceeding
	const validateStep = async (): Promise<boolean> => {
		if (currentStep === 2) {
			const nextAssignees =
				selectedManagers.length > 0
					? selectedManagers
					: ownerId
						? [ownerId]
						: [];
			if (nextAssignees.length === 0) {
				toast({
					title: "Required Fields Missing",
					description: "Assigned To is required before continuing.",
					variant: "destructive",
				});
				return false;
			}
			if (nextAssignees !== selectedManagers) {
				setSelectedManagers(nextAssignees);
			}
			form.setValue("assignedManagers", nextAssignees);
		}

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
					licenseNumber: needsDocumentNumber(values.licenseNumber)
						? generateDocumentNumber("LIC")
						: values.licenseNumber,
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
					assignedManagers:
						selectedManagers.length > 0 ? selectedManagers : [ownerId],
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

	const watchedDepartment = form.watch("department");
	const watchedDivision = form.watch("division");
	useEffect(() => {
		if (watchedDepartment) {
			void fetchDepartmentManagers(watchedDepartment, watchedDivision);
		}
	}, [watchedDepartment, watchedDivision, fetchDepartmentManagers]);

	useEffect(() => {
		form.setValue(
			"assignedManagers",
			selectedManagers.length > 0 ? selectedManagers : ownerId ? [ownerId] : [],
		);
	}, [form, ownerId, selectedManagers]);

	return (
		<>
			<Button
				type="button"
				className={className}
				onClick={() => setIsOpen(true)}
			>
				<Upload className="h-4 w-4" />
				{triggerLabel}
			</Button>

			<AppDialog
				open={isOpen}
				onOpenChange={setIsOpen}
				size="form"
				className="glass-dialog max-h-[90vh] sm:max-w-4xl"
				icon={<Upload className="h-5 w-5" />}
				title="Upload New License"
				description={`Step ${currentStep} of ${TOTAL_STEPS}: ${STEP_TITLES[currentStep - 1]}`}
				pending={isUploading}
				footer={
					<div className="flex w-full items-center justify-between gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								if (currentStep > 1 || processedFileData) {
									setCancelDialogOpen(true);
								} else {
									setIsOpen(false);
									resetForm();
								}
							}}
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
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
									className="flex items-center gap-2"
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
				}
			>
				<div className="space-y-4 pb-1">
					<div className="flex flex-wrap items-center justify-end gap-2">
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
					<StepIndicator
						currentStep={currentStep}
						onGoToStep={goToStep}
						processedFileData={processedFileData}
					/>
					<div
						ref={stepScrollRef}
						className="-mx-6 min-h-0 flex-1 overflow-y-auto px-4"
					>
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
											assigneeSource={assigneeSource}
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
				</div>
			</AppDialog>

			<CancelDialog
				open={cancelDialogOpen}
				onOpenChange={setCancelDialogOpen}
				onConfirm={handleCancelConfirm}
			/>

			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setDraftToDelete(null);
				}}
				variant="destructive"
				icon={<AlertTriangle className="h-5 w-5" />}
				title="Delete Draft"
				description="Are you sure you want to delete this draft? This action cannot be undone."
				helperText={
					<>
						Your decision to delete is irreversible, so please make sure you
						want to continue.
						<span className="mt-2 block text-xs font-medium text-slate-500">
							This action is permanent.
						</span>
					</>
				}
				confirmLabel="Delete Draft"
				confirmIcon={<Trash2 className="h-4 w-4" />}
				onConfirm={async () => {
					if (!draftToDelete) return;
					const id = draftToDelete;
					setDraftToDelete(null);
					await deleteDraft(id);
				}}
			/>
		</>
	);
};

export default LicenseUploadForm;
