/**
 * Contract Upload Form - Main Component
 * Lazy-loaded with deferred data fetching for optimal performance
 */

"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { Ban, ChevronLeft, ChevronRight, Loader2, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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
import { TOTAL_STEPS } from "./constants";
import { useContractForm } from "./hooks/useContractForm";
import { useDraftManagement } from "./hooks/useDraftManagement";
import { useManagers } from "./hooks/useManagers";
import type { ContractUploadFormProps, ProcessedFileData } from "./types";
import {
	parseCurrencyInput,
	parseIntegerInput,
	parseListInput,
	sanitizeString,
} from "./utils";

// Lazy load components
const Step1FileUpload = dynamic(() => import("./steps/Step1FileUpload"), {
	loading: () => (
		<div className="flex justify-center p-8">
			<Loader2 className="animate-spin" />
		</div>
	),
	ssr: false,
});

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

// TODO: Extract form steps 2-10 into separate components
// For now, steps 2-10 are not implemented in this refactored version

const ContractUploadForm: React.FC<ContractUploadFormProps> = ({
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
	const [currentStep, setCurrentStep] = useState(1);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [_deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [_draftToDelete, setDraftToDelete] = useState<string | null>(null);

	// Initialize form
	const { form, processFileSynchronously, extractContractData } =
		useContractForm();

	// Initialize managers (deferred until dialog opens)
	const {
		availableManagers,
		filteredManagers,
		selectedManagers,
		setSelectedManagers,
		selectedApprovers,
		setSelectedApprovers,
		fetchDepartmentManagers,
	} = useManagers(isOpen);

	// Reset function
	const resetForm = useCallback(() => {
		form.reset();
		setProcessedFileData(null);
		setExtractedData(null);
		setIsExtracting(false);
		setSelectedManagers([]);
		setSelectedApprovers([]);
		setIsUploading(false);
		setUploadProgress(0);
		setCurrentStep(1);
	}, [form, setSelectedManagers, setSelectedApprovers]);

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
		setProcessedFileData,
		setExtractedData,
		setCurrentStep,
		setIsOpen,
		resetForm,
	});

	// Step navigation
	const nextStep = () => {
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

					// Auto-extract data from contract using cached data
					setIsExtracting(true);
					try {
						const extracted = await extractContractData(processedData);
						setExtractedData(extracted);

						// Pre-fill form with extracted data
						if (extracted) {
							form.reset({
								...form.getValues(),
								contractName:
									(extracted.contractName as string) ||
									file.name.replace(/\.[^/.]+$/, ""),
								counterpartyLegalName:
									(extracted.counterpartyLegalName as string) || "",
								expiryDate: extracted.expiryDate
									? new Date(extracted.expiryDate as string)
									: undefined,
								startDate: extracted.startDate
									? new Date(extracted.startDate as string)
									: undefined,
								amount:
									(extracted.amount as string) ||
									(extracted.amount as number)?.toString() ||
									"",
								contractNumber: (extracted.contractNumber as string) || "",
								description: (extracted.description as string) || "",
							});
						}
					} catch (error) {
						console.error("Failed to extract contract data:", error);
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
			extractContractData,
			toast,
			setCurrentDraftId,
		],
	);

	// Handle form submission
	const handleSubmit = async (values: any) => {
		if (!processedFileData) {
			toast({
				title: "No File Selected",
				description: "Please select a contract file to upload.",
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

			const amountAsNumber = parseCurrencyInput(values.amount) ?? 0;

			const contractPayload = {
				contractName: values.contractName,
				contractType: values.contractType,
				contractCategory: values.contractCategory,
				lifecycleStatus: values.lifecycleStatus,
				contractNumber: values.contractNumber,
				description: sanitizeString(values.description),
				assignToDepartment: values.assignToDepartment,
				department: values.assignToDepartment,
				businessUnit: sanitizeString(values.businessUnit),
				subDepartment: sanitizeString(values.subDepartment),
				departmentOwner: sanitizeString(values.departmentOwner),
				contractOwnerId: values.contractOwnerId || ownerId,
				contractExpiryDate: values.expiryDate?.toISOString(),
				startDate: values.startDate?.toISOString(),
				executionDate: values.executionDate?.toISOString(),
				autoRenew: values.autoRenew,
				renewalNoticeDays: parseIntegerInput(values.renewalNoticeDays),
				amount: amountAsNumber,
				currencyCode: values.currencyCode,
				notToExceedAmount: parseCurrencyInput(values.notToExceedAmount),
				paymentTerms: sanitizeString(values.paymentTerms),
				paymentSchedule: sanitizeString(values.paymentSchedule),
				budgetCode: sanitizeString(values.budgetCode),
				costCenter: sanitizeString(values.costCenter),
				riskLevel: values.riskLevel as "critical" | "high" | "medium" | "low",
				counterpartyLegalName: values.counterpartyLegalName,
				vendor: sanitizeString(values.counterpartyLegalName),
				counterpartyContactEmail: sanitizeString(
					values.counterpartyContactEmail,
				),
				counterpartyContactPhone: sanitizeString(
					values.counterpartyContactPhone,
				),
				counterpartyAddress: sanitizeString(values.counterpartyAddress),
				counterpartyType: sanitizeString(values.counterpartyType),
				counterpartyTaxId: sanitizeString(values.counterpartyTaxId),
				counterpartyDunsNumber: sanitizeString(values.counterpartyDunsNumber),
				insuranceRequired: values.insuranceRequired,
				insuranceVerifiedDate: values.insuranceVerifiedDate?.toISOString(),
				insuranceExpiryDate: values.insuranceExpiryDate?.toISOString(),
				indemnificationIncluded: values.indemnificationIncluded,
				hipaaRequired: values.hipaaRequired,
				dataPrivacyRequirements: sanitizeString(values.dataPrivacyRequirements),
				backgroundCheckRequired: values.backgroundCheckRequired,
				regulatoryRequirements: sanitizeString(values.regulatoryRequirements),
				auditRightsGranted: values.auditRightsGranted,
				versionNumber: sanitizeString(values.versionNumber),
				templateUsed: sanitizeString(values.templateUsed),
				parentContractId: sanitizeString(values.parentContractId),
				relatedDocumentIds: parseListInput(values.relatedDocumentIds),
				attachmentReferences: parseListInput(values.attachmentReferences),
				keyObligations: parseListInput(values.keyObligations),
				serviceLevelAgreements: sanitizeString(values.serviceLevelAgreements),
				performanceMetrics: sanitizeString(values.performanceMetrics),
				reportingRequirements: sanitizeString(values.reportingRequirements),
				postTerminationObligations: sanitizeString(
					values.postTerminationObligations,
				),
				terminationNoticeDays: parseIntegerInput(values.terminationNoticeDays),
				terminationRights: sanitizeString(values.terminationRights),
				curePeriodDays: parseIntegerInput(values.curePeriodDays),
				approvalWorkflowTemplate: sanitizeString(
					values.approvalWorkflowTemplate,
				),
				currentApprovalStage: sanitizeString(values.currentApprovalStage),
				reviewerComments: sanitizeString(values.reviewerComments),
				assignedManagers: selectedManagers,
				internalApproverIds: selectedApprovers,
			};

			const enterpriseMetadata = {
				counterpartyContactName: sanitizeString(values.counterpartyContactName),
				counterpartyContactTitle: sanitizeString(
					values.counterpartyContactTitle,
				),
				erpReference: sanitizeString(values.erpReference),
				crmReference: sanitizeString(values.crmReference),
				projectMatterId: sanitizeString(values.projectMatterId),
				tags: parseListInput(values.tags),
				businessPurpose: sanitizeString(values.businessPurpose),
				primaryInternalContactId: sanitizeString(
					values.primaryInternalContactId,
				),
				secondaryInternalContactId: sanitizeString(
					values.secondaryInternalContactId,
				),
				alertRecipientIds: parseListInput(values.alertRecipientIds),
				alertEscalationContactIds: parseListInput(
					values.alertEscalationContactIds,
				),
				alertLeadTimes: parseListInput(values.alertLeadTimes),
				alertChannels: parseListInput(values.alertChannels),
				alertNotes: sanitizeString(values.alertNotes),
				alertStrategy: sanitizeString(values.alertStrategy),
				governingLaw: sanitizeString(values.governingLaw),
				jurisdiction: sanitizeString(values.jurisdiction),
				disputeResolutionMethod: values.disputeResolutionMethod
					? (values.disputeResolutionMethod as
							| "litigation"
							| "arbitration"
							| "mediation"
							| "negotiation"
							| "hybrid"
							| "other")
					: undefined,
				confidentialityClassification: values.confidentialityClassification
					? (values.confidentialityClassification as
							| "public"
							| "internal"
							| "confidential"
							| "restricted")
					: undefined,
				recordsRetentionPeriodMonths: parseIntegerInput(
					values.recordsRetentionPeriodMonths,
				),
				insuranceCoveragePerIncident: parseCurrencyInput(
					values.insuranceCoveragePerIncident,
				),
				insuranceCoverageAggregate: parseCurrencyInput(
					values.insuranceCoverageAggregate,
				),
				riskMitigationPlan: sanitizeString(values.riskMitigationPlan),
				milestones: parseListInput(values.milestones),
				deliverables: parseListInput(values.deliverables),
				slaPenalties: sanitizeString(values.slaPenalties),
				serviceCreditTerms: sanitizeString(values.serviceCreditTerms),
				escalationProcedures: sanitizeString(values.escalationProcedures),
				obligationOwners: parseListInput(values.obligationOwners),
				approvalDueDate: values.approvalDueDate?.toISOString(),
				approvalEscalationContactIds: parseListInput(
					values.approvalEscalationContactIds,
				),
				workflowNotes: sanitizeString(values.workflowNotes),
				digitalSignatureRequired: values.digitalSignatureRequired,
				digitalSignatureStatus: values.digitalSignatureStatus
					? (values.digitalSignatureStatus as
							| "not_started"
							| "pending"
							| "completed"
							| "declined"
							| "expired")
					: undefined,
				digitalSignaturePlatform: sanitizeString(
					values.digitalSignaturePlatform,
				),
				digitalSignatureCompletedAt:
					values.digitalSignatureCompletedAt?.toISOString(),
				digitalSignatureEnvelopeId: sanitizeString(
					values.digitalSignatureEnvelopeId,
				),
				signatureRecipientIds: parseListInput(values.signatureRecipientIds),
				visibilityRoles: parseListInput(values.visibilityRoles),
				searchKeywords: sanitizeString(values.searchKeywords),
				accessScope: sanitizeString(values.accessScope),
			};

			// Create File object from cached data for upload
			const fileForUpload = new File(
				[processedFileData.arrayBuffer],
				processedFileData.name,
				{
					type: processedFileData.type,
					lastModified: processedFileData.lastModified,
				},
			);

			// Upload file with contract metadata
			// Pass draftId so the contract can be linked to the draft via the relationship
			await uploadFile({
				file: fileForUpload,
				ownerId,
				accountId,
				path: path || "/",
				contractMetadata: {
					...contractPayload,
					enterpriseMetadata,
				},
				draftId: currentDraftId || undefined,
			});

			clearInterval(progressInterval);
			setUploadProgress(100);

			toast({
				title: "Contract Uploaded Successfully",
				description: `${values.contractName} has been uploaded and processed.`,
			});

			// Draft deletion is now handled automatically in uploadFile function
			// using fileId matching (primary) and filename matching (fallback)
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
				// Continue - contract is already uploaded successfully
			}

			// Reset form
			resetForm();
			setIsOpen(false);
			onSuccess?.();
		} catch (error) {
			console.error("Upload failed:", error);
			toast({
				title: "Upload Failed",
				description: "There was an error uploading your contract.",
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
	const watchedAssignToDepartment = form.watch("assignToDepartment");
	useEffect(() => {
		if (watchedAssignToDepartment) {
			fetchDepartmentManagers(watchedAssignToDepartment);
		}
	}, [watchedAssignToDepartment, fetchDepartmentManagers]);

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button className={className}>
						<Upload className="h-4 w-4" />
						Upload Contract
					</Button>
				</DialogTrigger>

				<DialogContent className="glass-dialog">
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>Upload Contract</DialogTitle>
					</VisuallyHiddenPrimitive.Root>

					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Sticky Header */}
					<div className="glass-dialog-wizard-header">
						<div className="px-6">
							<h2 className="text-2xl font-bold sidebar-gradient-text mb-3">
								Upload New Contract
							</h2>
							<StepIndicator currentStep={currentStep} onGoToStep={goToStep} />
						</div>
					</div>

					{/* Scrollable Content */}
					<div className="glass-dialog-scroll-area">
						<Form {...form}>
							<form
								id="contract-upload-form"
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

								{/* Steps 2-10: TODO - Implement form steps */}
								{currentStep >= 2 && currentStep <= 10 && (
									<div className="p-8 text-center text-slate-500">
										<p>Form steps 2-10 are being implemented.</p>
										<p className="text-sm mt-2">
											Please use the original ContractUploadForm component for
											now.
										</p>
									</div>
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
							onClick={() => setCancelDialogOpen(true)}
							className="flex items-center gap-2"
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
									type="submit"
									form="contract-upload-form"
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
											Upload Contract
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
			{/* TODO: Extract to separate component */}
		</>
	);
};

export default ContractUploadForm;
