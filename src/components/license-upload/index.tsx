/**
 * License Upload Form - Main Component
 * Lazy-loaded with deferred data fetching for optimal performance
 */

"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	Ban,
	ChevronLeft,
	ChevronRight,
	FileCheck,
	Loader2,
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
import { CancelUploadDialog } from "@/components/contract-upload/CancelUploadDialog";
import { SaveProgressCard } from "@/components/SaveProgressCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { CaalmFilledProvider, Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/actions/file.actions";
import {
	buildFormPatchFromLicenseExtraction,
	isRealLicenseExtractionMethod,
	LOW_LICENSE_EXTRACTION_CONFIDENCE,
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
import {
	getLicenseRequiredFieldsForStep,
	getLicenseTypeConfig,
	isDemoLicenseTypeAllowed,
} from "@/lib/licenses/licenseTypeConfigs";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import {
	DIALOG_BACK_LINK_CLASS,
	HEADER_BADGE_CLASS,
} from "@/lib/ui/modal-styles";
import { cn } from "@/lib/utils";
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

const DynamicLicenseStep = dynamic(() => import("./DynamicLicenseStep"), {
	loading: () => (
		<div className="flex justify-center p-8">
			<Loader2 className="animate-spin" />
		</div>
	),
	ssr: false,
});

const OwnershipStorageStep = dynamic(
	() => import("./components/OwnershipStorageStep"),
	{
		loading: () => (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin" />
			</div>
		),
		ssr: false,
	},
);

const LicenseTypeSelection = dynamic(() => import("./LicenseTypeSelection"), {
	ssr: false,
});

const LicenseDraftsList = dynamic(() => import("./LicenseDraftsList"), {
	ssr: false,
});

const LicenseTypeAssistant = dynamic(() => import("./LicenseTypeAssistant"), {
	ssr: false,
});

const StepIndicator = dynamic(() => import("./components/StepIndicator"), {
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
	const [selectedLicenseType, setSelectedLicenseType] = useState<string | null>(
		null,
	);
	const [showTypeSelection, setShowTypeSelection] = useState(true);
	const [showDraftsList, setShowDraftsList] = useState(false);
	const [showLicenseTypeAssistant, setShowLicenseTypeAssistant] =
		useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	// True once the user edits a field after the last save (or resume).
	const [dirtySinceSave, setDirtySinceSave] = useState(false);
	const stepScrollRef = useRef<HTMLDivElement | null>(null);

	// Initialize form
	const { form, processFileSynchronously, extractLicenseData } =
		useLicenseForm();

	const typeConfig = useMemo(
		() => getLicenseTypeConfig(selectedLicenseType),
		[selectedLicenseType],
	);
	const totalSteps = typeConfig ? typeConfig.steps.length + 2 : 1;
	const stepTitles = typeConfig
		? ["Upload File", ...typeConfig.steps.map((s) => s.title), "Review"]
		: ["Upload File"];
	const ownershipStepNumber = typeConfig
		? typeConfig.steps.findIndex((s) => s.kind === "ownership") + 2
		: -1;

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
		setDirtySinceSave(false);
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
		setSelectedLicenseType(null);
		setShowTypeSelection(true);
		setShowDraftsList(false);
		setShowLicenseTypeAssistant(false);
	}, [form, setSelectedManagers]);

	// Initialize draft management
	const {
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
		handleManualSave,
	} = useDraftManagement({
		ownerId,
		accountId,
		currentStep,
		totalSteps,
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
		onRestoreLicenseType: (licenseTypeId) => {
			setSelectedLicenseType(licenseTypeId);
			setShowTypeSelection(false);
			setShowDraftsList(false);
		},
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
			// The draft service strips filledFieldNames/fieldConfidence to save
			// space, so rebuild them from the saved field values on resume.
			const parsed = parseLicenseExtractionJson(JSON.stringify(extracted));
			const filled =
				Array.isArray(extracted.filledFieldNames) &&
				extracted.filledFieldNames.length > 0
					? (extracted.filledFieldNames as string[])
					: parsed.filledFieldNames;
			const low =
				Array.isArray(extracted.lowConfidenceFields) &&
				extracted.lowConfidenceFields.length > 0
					? (extracted.lowConfidenceFields as string[])
					: parsed.lowConfidenceFields;
			const conf =
				extracted.fieldConfidence &&
				typeof extracted.fieldConfidence === "object" &&
				Object.keys(extracted.fieldConfidence as object).length > 0
					? (extracted.fieldConfidence as Record<string, number>)
					: parsed.fieldConfidence;
			setAiFilledFields(filled);
			setLowConfidenceFields(low);
			setFieldConfidence(conf);
			setOverallExtractionConfidence(
				typeof extracted.overallConfidence === "number"
					? extracted.overallConfidence
					: parsed.overallConfidence,
			);
		},
	});

	const handleLicenseTypeSelect = useCallback(
		(typeId: string) => {
			const config = getLicenseTypeConfig(typeId);
			if (!config || !isDemoLicenseTypeAllowed(typeId)) return;
			setSelectedLicenseType(typeId);
			setShowTypeSelection(false);
			setCurrentStep(1);
			form.setValue("licenseTypeId", typeId);
			form.setValue("licenseType", config.label);
		},
		[form],
	);

	// Step navigation
	const nextStep = async () => {
		// Validate current step before proceeding
		setIsValidating(true);
		const isValid = await validateStep();
		setIsValidating(false);

		if (!isValid) {
			return; // Don't proceed if validation fails
		}

		if (currentStep < totalSteps) {
			setCurrentStep((prev) => prev + 1);
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep((prev) => prev - 1);
		}
	};

	const goToStep = (step: number) => {
		if (step >= 1 && step <= totalSteps) {
			setCurrentStep(step);
		}
	};

	useEffect(() => {
		if (stepScrollRef.current) {
			stepScrollRef.current.scrollTop = 0;
		}
	}, [currentStep]);

	// Track edits since the last save so Cancel knows whether work would be lost.
	useEffect(() => {
		const subscription = form.watch((_values, info) => {
			if (info.type === "change") setDirtySinceSave(true);
		});
		return () => subscription.unsubscribe();
	}, [form]);

	// A successful save (auto or manual) clears the "unsaved changes" flag.
	useEffect(() => {
		if (lastSavedAt) setDirtySinceSave(false);
	}, [lastSavedAt]);

	const clearUploadedFile = useCallback(() => {
		setProcessedFileData(null);
		setExtractedData(null);
		setExtractionMethod(null);
		setAiFilledFields([]);
		setLowConfidenceFields([]);
		setFieldConfidence({});
		setOverallExtractionConfidence(null);
		setFileIngestUi("hidden");
		setFileIngestProgress(0);
		if (fileIngestSuccessTimeoutRef.current) {
			clearTimeout(fileIngestSuccessTimeoutRef.current);
			fileIngestSuccessTimeoutRef.current = null;
		}
	}, []);

	/** Step 1 back link: return to the license type grid. */
	const handleChangeType = useCallback(() => {
		setSelectedLicenseType(null);
		setShowTypeSelection(true);
		setCurrentStep(1);
	}, []);

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

							// A "real" run that filled nothing is a failed read, not a 0% success.
							const usable =
								isRealLicenseExtractionMethod(method) &&
								filledFromApi.length > 0;

							if (usable) {
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
								if (isRealLicenseExtractionMethod(method)) {
									toast({
										title: "CAALM couldn't read any fields",
										description:
											"Nothing could be filled from this file. You can still fill the form by hand.",
										variant: "destructive",
									});
								}
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

	const currentDynamicStep = typeConfig?.steps[currentStep - 2];

	// Step validation - defines required fields for each step
	const getRequiredFieldsForStep = (step: number): string[] => {
		if (step === 1 || step === totalSteps || !selectedLicenseType) return [];
		const typeStep = typeConfig?.steps[step - 2];
		if (!typeStep) return [];
		if (typeStep.kind === "ownership") return ["division", "department"];
		return getLicenseRequiredFieldsForStep(selectedLicenseType, step - 2);
	};

	// Validate current step before proceeding
	const validateStep = async (): Promise<boolean> => {
		if (currentDynamicStep?.kind === "ownership") {
			const nextAssignees =
				selectedManagers.length > 0
					? selectedManagers
					: ownerId
						? [ownerId]
						: [];
			if (nextAssignees.length === 0) {
				toast({
					title: "Required Fields Missing",
					description: "Responsible Owner is required before continuing.",
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

			// Upload file with license metadata. Type-specific fields are real
			// LicenseMetadataPayload attributes (src/types/licenses.ts) backed by
			// matching Appwrite string columns on the Licenses collection,
			// matching how contracts persist their own type-specific fields.
			await uploadFile({
				file: fileForUpload,
				ownerId,
				accountId,
				path: "/licenses",
				licenseMetadata: {
					licenseTypeId: values.licenseTypeId,
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
					entityCovered: sanitizeString(values.entityCovered),
					renewalFrequency: sanitizeString(values.renewalFrequency),
					fileLocation: sanitizeString(values.fileLocation),
					holderName: sanitizeString(values.holderName),
					holderRole: sanitizeString(values.holderRole),
					licenseBoard: sanitizeString(values.licenseBoard),
					carrierName: sanitizeString(values.carrierName),
					policyNumber: sanitizeString(values.policyNumber),
					coverageAmount: sanitizeString(values.coverageAmount),
					certificateHolder: sanitizeString(values.certificateHolder),
					backgroundScreeningStatus: sanitizeString(
						values.backgroundScreeningStatus,
					),
					agencyContractReference: sanitizeString(
						values.agencyContractReference,
					),
					hipaaComplianceRecord: sanitizeString(values.hipaaComplianceRecord),
					substanceUseCertification: sanitizeString(
						values.substanceUseCertification,
					),
					hrsaComplianceStatus: sanitizeString(values.hrsaComplianceStatus),
					phsDeemedStatus: sanitizeString(values.phsDeemedStatus),
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

	// Leave the wizard without saving; a draft that was already saved stays in Drafts.
	const exitWizard = useCallback(() => {
		setCancelDialogOpen(false);
		setIsOpen(false);
		resetForm();
		isResumingDraftRef.current = false;
	}, [resetForm, isResumingDraftRef]);

	// Closing a form step asks first, unless there is nothing to lose.
	const hasUnsavedChanges =
		dirtySinceSave || (!!processedFileData && !lastSavedAt);
	const hasWorkToLose = hasUnsavedChanges || !!lastSavedAt;

	// Footer Cancel: ask first, unless there is nothing to lose.
	const handleCancelClick = useCallback(() => {
		if (hasWorkToLose) setCancelDialogOpen(true);
		else exitWizard();
	}, [hasWorkToLose, exitWizard]);

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

	const showPicker =
		showTypeSelection &&
		!selectedLicenseType &&
		!showDraftsList &&
		!showLicenseTypeAssistant;

	return (
		<>
			<Dialog
				open={isOpen}
				onOpenChange={(open) => {
					if (!open && hasWorkToLose) {
						setCancelDialogOpen(true);
						return;
					}
					setIsOpen(open);
					if (!open) {
						resetForm();
						isResumingDraftRef.current = false;
					} else if (!isResumingDraftRef.current) {
						resetForm();
					}
				}}
			>
				<DialogTrigger asChild>
					<Button type="button" className={className}>
						<Upload className="h-4 w-4" />
						{triggerLabel}
					</Button>
				</DialogTrigger>

				<DialogContent
					className={cn(
						"glass-dialog flex max-h-[90vh] flex-col gap-0 p-0",
						// Non-wizard screens match ContractUploadForm.tsx's dimensions
						// exactly: drafts override glass-dialog's default sm:max-w-4xl,
						// the type picker and assistant use that default as-is. Only
						// the step wizard itself keeps its own, wider dimension.
						showDraftsList
							? savedDrafts.length > 0
								? "sm:max-w-2xl!"
								: "sm:max-w-md!"
							: showPicker || showLicenseTypeAssistant
								? undefined
								: "sm:max-w-6xl",
					)}
				>
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>Upload License</DialogTitle>
						<DialogDescription>
							Choose a license type, then upload and review the record.
						</DialogDescription>
					</VisuallyHiddenPrimitive.Root>

					{showPicker ? (
						<LicenseTypeSelection
							savedDraftsCount={savedDrafts.length}
							onOpenDrafts={() => {
								void loadSavedDrafts();
								setShowDraftsList(true);
							}}
							onSelectType={handleLicenseTypeSelect}
							onOpenAssistant={() => setShowLicenseTypeAssistant(true)}
						/>
					) : showDraftsList ? (
						<LicenseDraftsList
							drafts={savedDrafts}
							onBack={() => setShowDraftsList(false)}
							onResumeDraft={resumeDraft}
							onDeleteDraft={deleteDraft}
						/>
					) : showLicenseTypeAssistant ? (
						<LicenseTypeAssistant
							onBack={() => setShowLicenseTypeAssistant(false)}
							onSelectType={(typeId) => {
								setShowLicenseTypeAssistant(false);
								handleLicenseTypeSelect(typeId);
							}}
						/>
					) : (
						<>
							{/* Sticky Header — frosted strip */}
							<div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-white/50 py-4 backdrop-blur-xl">
								<div className="px-6">
									<div className="mb-2 flex h-8 items-center pr-10">
										{currentStep === 1 && selectedLicenseType ? (
											<button
												type="button"
												onClick={handleChangeType}
												disabled={isUploading}
												className={DIALOG_BACK_LINK_CLASS}
											>
												<ChevronLeft
													className="h-[15px] w-[15px]"
													aria-hidden
												/>
												Change type
											</button>
										) : (
											currentStep > 1 && (
												<button
													type="button"
													onClick={prevStep}
													disabled={isUploading}
													className={DIALOG_BACK_LINK_CLASS}
												>
													<ChevronLeft
														className="h-[15px] w-[15px]"
														aria-hidden
													/>
													Previous
												</button>
											)
										)}
									</div>
									<div className="mb-3 flex items-start justify-between gap-3">
										<div className="flex min-w-0 items-start gap-[11px]">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#0f5384]/15 bg-white">
												<Upload
													className="h-[18px] w-[18px] text-[#0f5384]"
													aria-hidden
												/>
											</div>
											<div className="min-w-0">
												<div className="flex min-h-[23px] flex-wrap items-center gap-2.5">
													<h2 className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]">
														{typeConfig?.label || "Upload License"}
													</h2>
												</div>
												<p className="mt-0.5 text-xs text-slate-500">
													Step {currentStep} of {totalSteps} ·{" "}
													{stepTitles[currentStep - 1]}
												</p>
											</div>
										</div>
										<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
											<AiExtractionStatusBadge
												method={extractionMethod}
												overallConfidence={overallExtractionConfidence}
												filledCount={aiFilledFields.length}
											/>
											{isSaving && (
												<Badge
													variant="outline"
													className={cn(
														HEADER_BADGE_CLASS,
														"sidebar-gradient-text",
													)}
												>
													<Loader2 className="h-3 w-3 mr-1 animate-spin" />
													Saving...
												</Badge>
											)}
											{lastSavedAt && !isSaving && (
												<Badge
													variant="outline"
													className={cn(
														HEADER_BADGE_CLASS,
														"text-slate-600 border-slate-300",
													)}
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

									{/* Progress Bar */}
									<div className="-mx-6 h-[3px] overflow-hidden bg-slate-100">
										<div
											className="h-full rounded-[0_99px_99px_0] bg-[linear-gradient(90deg,#00c1cb,#078fab,#0e638f)] transition-[width] duration-300 ease-out"
											style={{ width: `${(currentStep / totalSteps) * 100}%` }}
										/>
									</div>

									<div className="mt-3">
										<StepIndicator
											currentStep={currentStep}
											stepTitles={stepTitles}
											onGoToStep={goToStep}
											processedFileData={processedFileData}
										/>
									</div>
								</div>
							</div>

							<div
								ref={stepScrollRef}
								className="min-h-0 flex-1 overflow-y-auto bg-transparent p-4"
							>
								<Form {...form}>
									<CaalmFilledProvider
										value={{
											names: aiFilledFields,
											confidence: fieldConfidence,
											lowThreshold: LOW_LICENSE_EXTRACTION_CONFIDENCE,
										}}
									>
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
													isUploading={isUploading}
													fileIngestUi={fileIngestUi}
													fileIngestProgress={fileIngestProgress}
													onDrop={onDrop}
													onRemoveFile={clearUploadedFile}
												/>
											)}

											{/* Dynamic steps: record details, identifiers, compliance, ownership */}
											{typeConfig &&
												currentDynamicStep &&
												currentStep > 1 &&
												currentStep < totalSteps && (
													<>
														{currentStep === 2 && (
															<AiExtractionReviewPanel
																method={extractionMethod}
																overallConfidence={overallExtractionConfidence}
																filledCount={aiFilledFields.length}
																lowConfidenceFields={lowConfidenceFields}
															/>
														)}
														{currentDynamicStep.kind === "ownership" ? (
															<OwnershipStorageStep
																form={form}
																departments={departments}
																filteredManagers={filteredManagers}
																selectedManagers={selectedManagers}
																setSelectedManagers={setSelectedManagers}
																fetchDepartmentManagers={
																	fetchDepartmentManagers
																}
																assigneeSource={assigneeSource}
															/>
														) : (
															<DynamicLicenseStep
																step={currentDynamicStep}
																form={form}
															/>
														)}
													</>
												)}

											{/* Final step: Review before submit-for-review */}
											{currentStep === totalSteps && typeConfig && (
												<LicenseReviewStep
													values={form.watch() as Record<string, unknown>}
													typeConfig={typeConfig}
													ownershipStepNumber={ownershipStepNumber}
													fileName={processedFileData?.name}
													lowConfidenceFields={lowConfidenceFields}
													onEditStep={goToStep}
												/>
											)}

											{/* Save Progress Card — dynamic steps only (not final review) */}
											{currentStep > 1 &&
												currentStep < totalSteps &&
												processedFileData && (
													<SaveProgressCard
														onSave={handleManualSave}
														isSaving={isSaving}
													/>
												)}
										</form>
									</CaalmFilledProvider>
								</Form>
							</div>

							{/* Sticky Footer with Navigation and Action Buttons */}
							<div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
								<div className="flex items-center justify-between">
									<Button
										type="button"
										variant="ghost"
										onClick={handleCancelClick}
										disabled={isUploading}
										className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
									>
										<Ban className="h-4 w-4" />
										Cancel
									</Button>

									<div className="flex items-center gap-2">
										{currentStep < totalSteps ? (
											<Button
												type="button"
												onClick={nextStep}
												disabled={
													(currentStep === 1 && !processedFileData) ||
													isValidating
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
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			<CancelUploadDialog
				open={cancelDialogOpen}
				hasUnsavedChanges={hasUnsavedChanges}
				canSave={currentStep > 1}
				onKeepEditing={() => setCancelDialogOpen(false)}
				onExit={exitWizard}
				onSaveAndExit={async () => {
					const saved = await handleManualSave();
					if (saved) {
						setCancelDialogOpen(false);
						isResumingDraftRef.current = false;
					}
					return saved;
				}}
			/>
		</>
	);
};

export default LicenseUploadForm;
