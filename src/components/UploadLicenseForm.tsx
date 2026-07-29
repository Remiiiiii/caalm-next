/**
 * Upload License Form Component
 * Standalone component file for license upload functionality
 * Similar structure to ContractUploadForm.tsx
 */

"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { Ban, ChevronLeft, ChevronRight, Loader2, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	AiExtractionReviewPanel,
	AiExtractionStatusBadge,
} from "@/components/contract-upload/AiExtractionReview";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getContractDepartmentEnums } from "@/lib/actions/database.actions";
import { uploadFile } from "@/lib/actions/file.actions";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import {
	buildFormPatchFromLicenseExtraction,
	isRealLicenseExtractionMethod,
	parseLicenseExtractionJson,
} from "@/lib/ai/licenseExtractionSchema";
import { TOTAL_STEPS } from "./license-upload/constants";
import { useDraftManagement } from "./license-upload/hooks/useDraftManagement";
import { useLicenseForm } from "./license-upload/hooks/useLicenseForm";
import { useManagers } from "./license-upload/hooks/useManagers";
import type {
	LicenseUploadFormProps,
	ProcessedFileData,
} from "./license-upload/types";
import {
	parseCurrencyInput,
	parseIntegerInput,
	sanitizeString,
} from "./license-upload/utils";

// Lazy load components
const Step1FileUpload = dynamic(
	() => import("./license-upload/steps/Step1FileUpload"),
	{
		loading: () => (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin" />
			</div>
		),
		ssr: false,
	},
);

const Step2LicenseDetails = dynamic(
	() => import("./license-upload/steps/Step2LicenseDetails"),
	{
		loading: () => (
			<div className="flex justify-center p-8 ">
				<Loader2 className="animate-spin" />
			</div>
		),
		ssr: false,
	},
);

const StepIndicator = dynamic(
	() => import("./license-upload/components/StepIndicator"),
	{
		ssr: false,
	},
);

const SaveProgressCard = dynamic(
	() => import("./license-upload/components/SaveProgressCard"),
	{
		ssr: false,
	},
);

const CancelDialog = dynamic(
	() => import("./license-upload/components/CancelDialog"),
	{
		ssr: false,
	},
);

const LicenseReviewStep = dynamic(
	() => import("./license-upload/steps/LicenseReviewStep"),
	{
		loading: () => (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin" />
			</div>
		),
		ssr: false,
	},
);

const UploadLicenseForm: React.FC<LicenseUploadFormProps> = ({
	ownerId,
	accountId,
	className,
	onSuccess,
}) => {
	const path = usePathname();
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
	const [extractionMethod, setExtractionMethod] = useState<string | null>(
		null,
	);
	const [aiFilledFields, setAiFilledFields] = useState<string[]>([]);
	const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>(
		[],
	);
	const [fieldConfidence, setFieldConfidence] = useState<
		Record<string, number>
	>({});
	const [overallExtractionConfidence, setOverallExtractionConfidence] =
		useState<number | null>(null);
	const [currentStep, setCurrentStep] = useState(1);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [_deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [_draftToDelete, setDraftToDelete] = useState<string | null>(null);
	const [departments, setDepartments] = useState<string[]>([]);

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

	// Reset function
	const resetForm = useCallback(() => {
		form.reset();
		setProcessedFileData(null);
		setExtractedData(null);
		setIsExtracting(false);
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
	});

	// Step navigation
	const nextStep = () => {
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

				try {
					// Reset draft ID - each file upload creates a new draft
					setCurrentDraftId(null);

					// Process file synchronously and cache all data
					const processedData = await processFileSynchronously(file);
					setProcessedFileData(processedData);

					setIsExtracting(true);
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
				path: path || "/",
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

			await refreshStorageUsage();

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
			onSuccess?.();
		} catch (error) {
			console.error("Upload failed:", error);
			toast({
				title: "Upload Failed",
				description: "There was an error uploading your license.",
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

	// Fetch departments from database when dialog opens
	useEffect(() => {
		if (isOpen && departments.length === 0) {
			getContractDepartmentEnums()
				.then((list) => setDepartments(list || []))
				.catch(() => setDepartments([]));
		}
	}, [isOpen, departments.length]);

	// Watch department changes to load managers for that department
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
						Upload License
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
						<div className="px-6">
							<h2 className="text-2xl font-bold sidebar-gradient-text mb-3">
								Upload New License
							</h2>
							<StepIndicator
								currentStep={currentStep}
								onGoToStep={goToStep}
								processedFileData={processedFileData}
							/>
						</div>
					</div>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto p-4 bg-white">
						<Form {...form}>
							<form
								id="license-upload-form"
								onSubmit={(e) => {
									e.preventDefault();
								}}
								onKeyDown={(e) => {
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
										onDrop={onDrop}
										onResumeDraft={resumeDraft}
										onDeleteDraft={handleDeleteClick}
									/>
								)}

								{/* Step 2: License Details */}
								{currentStep === 2 && (
									<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
										<div className="mb-4 flex items-center justify-between gap-2">
											<h3 className="text-lg font-semibold text-slate-700">
												2. License Details
											</h3>
											<AiExtractionStatusBadge
												method={extractionMethod}
												overallConfidence={overallExtractionConfidence}
												filledCount={aiFilledFields.length}
											/>
										</div>
										<div className="space-y-6">
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
											{processedFileData && (
												<SaveProgressCard
													onSave={handleManualSave}
													isSaving={isSaving}
												/>
											)}
										</div>
									</div>
								)}

								{currentStep === 3 && (
									<LicenseReviewStep
										values={form.watch() as Record<string, unknown>}
										fileName={processedFileData?.name}
										lowConfidenceFields={lowConfidenceFields}
										onEditStep={goToStep}
									/>
								)}
							</form>
						</Form>
					</div>

					{/* Footer */}
					<div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between">
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
									disabled={currentStep === 1 && !processedFileData}
									className="primary-btn flex items-center gap-2"
								>
									Next
									<ChevronRight className="h-4 w-4" />
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
		</>
	);
};

export default UploadLicenseForm;
