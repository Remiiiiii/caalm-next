"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import {
	AlertTriangle,
	Ban,
	Calendar as CalendarIcon,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	FileCheck,
	FileText,
	Loader2,
	StepForward,
	Trash2,
	Upload,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import { useDropzone } from "react-dropzone";
import { SaveProgressCard } from "@/components/SaveProgressCard";
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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import "react-datepicker/dist/react-datepicker.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
	Briefcase,
	Building2,
	Gift,
	Handshake,
	Heart,
	Home,
	Package,
	Shield,
	UserCheck,
	Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
	getAllManagers,
	getUsersByDepartment,
} from "@/lib/actions/database.actions";
import { uploadFile } from "@/lib/actions/file.actions";
import {
	CONTRACT_TYPE_CONFIGS,
	getContractTypeConfig,
	getFieldsForStep,
	getRequiredFields,
} from "@/lib/contracts/contractTypeConfigs";
import { CONTRACT_DEPARTMENTS } from "../../constants";

interface ContractUploadFormProps {
	ownerId: string;
	accountId: string;
	className?: string;
	onSuccess?: () => void;
}

// Processed file data interface
interface ProcessedFileData {
	name: string;
	type: string;
	size: number;
	base64Content: string;
	arrayBuffer: ArrayBuffer;
	lastModified: number;
}

const CONTRACT_TYPES = [
	"Service Agreement",
	"Professional Services",
	"Purchase Agreement",
	"Lease Agreement",
	"License Agreement",
	"Employment Contract",
	"Confidentiality/NDA",
	"Vendor Contract",
	"Master Agreement",
	"Statement of Work (SOW)",
	"Amendment",
	"Other",
];

const AI_QUIZ_QUESTIONS = [
	{
		id: "party_type",
		text: "Is this contract between a business and individual, or business to business?",
		options: [
			{ value: "B2B", label: "Business to business" },
			{ value: "B2C", label: "Business to individual" },
			{ value: "Both", label: "Both / Mixed" },
		],
	},
	{
		id: "duration",
		text: "Does this involve ongoing services or a one-time transaction?",
		options: [
			{ value: "Ongoing", label: "Ongoing services" },
			{ value: "One-time", label: "One-time transaction" },
			{ value: "Mixed", label: "Mixed" },
		],
	},
	{
		id: "purpose",
		text: "What best describes the primary purpose?",
		options: [
			{ value: "Employment", label: "Employment / hiring" },
			{ value: "Services", label: "Services / consulting" },
			{ value: "Funding", label: "Funding / grants" },
			{ value: "Property", label: "Property / lease" },
			{ value: "Partnership", label: "Partnership / collaboration" },
			{ value: "Donation", label: "Donation / gift" },
			{ value: "Government", label: "Government / regulatory" },
			{ value: "Other", label: "Other" },
		],
	},
	{
		id: "compliance",
		text: "Does this require government or regulatory compliance?",
		options: [
			{ value: "Yes", label: "Yes" },
			{ value: "No", label: "No" },
			{ value: "Unsure", label: "Unsure" },
		],
	},
];

const LIFECYCLE_STATUSES = [
	{ value: "draft", label: "Draft" },
	{ value: "under_review", label: "Under Review" },
	{ value: "approved", label: "Approved" },
	{ value: "active", label: "Active" },
	{ value: "expired", label: "Expired" },
	{ value: "terminated", label: "Terminated" },
	{ value: "on_hold", label: "On Hold" },
];

const RISK_LEVELS = [
	{ value: "critical", label: "Critical" },
	{ value: "high", label: "High" },
	{ value: "medium", label: "Medium" },
	{ value: "low", label: "Low" },
];

const CURRENCY_CODES = [
	"USD",
	"EUR",
	"GBP",
	"CAD",
	"MXN",
	"JPY",
	"AUD",
	"other",
];

const PAYMENT_TERM_OPTIONS = [
	{ value: "due_on_receipt", label: "Due on Receipt" },
	{ value: "net_15", label: "Net 15" },
	{ value: "net_30", label: "Net 30" },
	{ value: "net_45", label: "Net 45" },
	{ value: "net_60", label: "Net 60" },
	{ value: "net_90", label: "Net 90" },
	{ value: "custom", label: "Custom" },
];

const PAYMENT_SCHEDULE_OPTIONS = [
	{ value: "one_time", label: "One-time" },
	{ value: "per_service", label: "Per Service" },
	{ value: "monthly", label: "Monthly" },
	{ value: "quarterly", label: "Quarterly" },
	{ value: "annually", label: "Annually" },
	{ value: "milestone", label: "Milestone-based" },
	{ value: "other", label: "Other" },
];

const COUNTERPARTY_TYPES = [
	{ value: "individual", label: "Individual" },
	{ value: "corporation", label: "Corporation" },
	{ value: "llc", label: "LLC" },
	{ value: "government", label: "Government Entity" },
	{ value: "nonprofit", label: "Nonprofit" },
	{ value: "partnership", label: "Partnership" },
	{ value: "other", label: "Other" },
];

const _ALERT_TIMING_OPTIONS = [
	{ value: "none", label: "No Alerts" },
	{ value: "30_days", label: "30 Days" },
	{ value: "60_days", label: "60 Days" },
	{ value: "90_days", label: "90 Days" },
	{ value: "custom", label: "Custom" },
];

const DISPUTE_METHOD_OPTIONS = [
	"litigation",
	"arbitration",
	"mediation",
	"hybrid",
	"other",
];

const CONFIDENTIALITY_CLASSES = [
	"public",
	"internal",
	"confidential",
	"restricted",
];

const SIGNATURE_STATUS_OPTIONS = [
	"pending",
	"completed",
	"waived",
	"cancelled",
];

const ACCESS_SCOPE_OPTIONS = ["organization", "department", "restricted"];

const contractSchema = z.object({
	contractName: z
		.string()
		.min(1, "Contract title is required")
		.max(200, "Keep the title under 200 characters"),
	contractType: z.string().min(1, "Contract type is required"),
	contractCategory: z.string().optional(), // Category field removed from UI, made optional
	lifecycleStatus: z.string().min(1, "Lifecycle status is required"),
	contractNumber: z.string().min(1, "Contract number is required"),
	description: z.string().optional(),
	assignToDepartment: z
		.string()
		.min(1, "Business unit / department is required"),
	businessUnit: z.string().optional(),
	subDepartment: z.string().optional(),
	departmentOwner: z.string().optional(),
	contractOwnerId: z.string().min(1, "Owner is required"),
	startDate: z.date().optional(),
	executionDate: z.date().optional(),
	expiryDate: z
		.date({ message: "Expiry date is required" })
		.refine((val) => !Number.isNaN(val.getTime()), {
			message: "Expiry date is required",
		}),
	autoRenew: z.boolean().default(false),
	renewalNoticeDays: z.string().optional(),
	amount: z
		.string()
		.min(1, "Contract amount is required")
		.refine((val) => {
			const num = parseFloat(val.replace(/[$,]/g, ""));
			return !Number.isNaN(num) && num >= 0;
		}, "Please enter a valid amount"),
	currencyCode: z.string().min(1, "Currency is required"),
	notToExceedAmount: z.string().optional(),
	paymentTerms: z.string().optional(),
	paymentSchedule: z.string().optional(),
	budgetCode: z.string().optional(),
	costCenter: z.string().optional(),
	riskLevel: z.string().min(1, "Risk level is required"),
	counterpartyLegalName: z
		.string()
		.min(1, "Counterparty legal entity name is required"),
	counterpartyContactName: z.string().optional(),
	counterpartyContactTitle: z.string().optional(),
	counterpartyContactEmail: z
		.string()
		.email("Provide a valid email address")
		.optional()
		.or(z.literal("")),
	counterpartyContactPhone: z.string().optional(),
	counterpartyAddress: z.string().optional(),
	counterpartyType: z.string().optional(),
	counterpartyTaxId: z.string().optional(),
	counterpartyDunsNumber: z.string().optional(),
	insuranceRequired: z.boolean().default(false),
	insuranceVerifiedDate: z.date().optional(),
	insuranceExpiryDate: z.date().optional(),
	insuranceCoveragePerIncident: z.string().optional(),
	insuranceCoverageAggregate: z.string().optional(),
	indemnificationIncluded: z.boolean().default(false),
	hipaaRequired: z.boolean().default(false),
	dataPrivacyRequirements: z.string().optional(),
	backgroundCheckRequired: z.boolean().default(false),
	regulatoryRequirements: z.string().optional(),
	auditRightsGranted: z.boolean().default(false),
	versionNumber: z.string().optional(),
	templateUsed: z.string().optional(),
	parentContractId: z.string().optional(),
	relatedDocumentIds: z.string().optional(),
	attachmentReferences: z.string().optional(),
	tags: z.string().optional(),
	businessPurpose: z.string().optional(),
	projectMatterId: z.string().optional(),
	erpReference: z.string().optional(),
	crmReference: z.string().optional(),
	keyObligations: z.string().optional(),
	serviceLevelAgreements: z.string().optional(),
	performanceMetrics: z.string().optional(),
	reportingRequirements: z.string().optional(),
	postTerminationObligations: z.string().optional(),
	terminationNoticeDays: z.string().optional(),
	terminationRights: z.string().optional(),
	curePeriodDays: z.string().optional(),
	riskMitigationPlan: z.string().optional(),
	milestones: z.string().optional(),
	deliverables: z.string().optional(),
	slaPenalties: z.string().optional(),
	serviceCreditTerms: z.string().optional(),
	escalationProcedures: z.string().optional(),
	obligationOwners: z.string().optional(),
	assignedManagers: z.array(z.string()).optional(),
	internalApproverIds: z.array(z.string()).optional(),
	approvalWorkflowTemplate: z.string().optional(),
	currentApprovalStage: z.string().optional(),
	reviewerComments: z.string().optional(),
	approvalDueDate: z.date().optional(),
	approvalEscalationContactIds: z.string().optional(),
	workflowNotes: z.string().optional(),
	primaryInternalContactId: z.string().optional(),
	secondaryInternalContactId: z.string().optional(),
	alertRecipientIds: z.string().optional(),
	alertEscalationContactIds: z.string().optional(),
	alertLeadTimes: z.string().optional(),
	alertChannels: z.string().optional(),
	alertNotes: z.string().optional(),
	alertStrategy: z.string().optional(),
	governingLaw: z.string().optional(),
	jurisdiction: z.string().optional(),
	disputeResolutionMethod: z.string().optional(),
	confidentialityClassification: z.string().optional(),
	recordsRetentionPeriodMonths: z.string().optional(),
	searchKeywords: z.string().optional(),
	digitalSignatureRequired: z.boolean().default(false),
	digitalSignatureStatus: z.string().optional(),
	digitalSignaturePlatform: z.string().optional(),
	digitalSignatureCompletedAt: z.date().optional(),
	digitalSignatureEnvelopeId: z.string().optional(),
	signatureRecipientIds: z.string().optional(),
	visibilityRoles: z.string().optional(),
	accessScope: z.string().optional(),

	// Type-specific fields
	grantTerms: z.string().optional(),
	donorRestrictions: z.string().optional(),
	projectDescription: z.string().optional(),
	propertyDescription: z.string().optional(),
});

const ContractUploadForm: React.FC<ContractUploadFormProps> = ({
	ownerId,
	accountId,
	className,
	onSuccess,
}) => {
	const path = usePathname();
	const router = useRouter();
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [processedFileData, setProcessedFileData] =
		useState<ProcessedFileData | null>(null);
	const [extractedData, setExtractedData] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [isExtracting, setIsExtracting] = useState(false);
	const [availableManagers, setAvailableManagers] = useState<
		Array<{ $id: string; fullName: string; email: string; division?: string }>
	>([]);
	const [filteredManagers, setFilteredManagers] = useState<
		Array<{ $id: string; fullName: string; email: string; division?: string }>
	>([]);
	const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
	const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
	const [currentStep, setCurrentStep] = useState(1);
	const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const isResumingDraftRef = React.useRef(false);

	// Contract type selection state
	const [selectedContractType, setSelectedContractType] = useState<
		string | null
	>(null);
	const [showTypeSelection, setShowTypeSelection] = useState(true);

	// AI quiz state
	const [showAiQuiz, setShowAiQuiz] = useState(false);
	const [aiQuizStep, setAiQuizStep] = useState(0);
	const [aiQuizAnswers, setAiQuizAnswers] = useState<Record<string, string>>(
		{},
	);
	const [aiSuggestedTypeId, setAiSuggestedTypeId] = useState<string | null>(
		null,
	);
	const [aiQuizPhase, setAiQuizPhase] = useState<
		"questions" | "loading" | "result"
	>("questions");
	const [aiQuizDirection, setAiQuizDirection] = useState<"forward" | "back">(
		"forward",
	);

	// Get current contract type configuration
	const currentTypeConfig = selectedContractType
		? getContractTypeConfig(selectedContractType)
		: null;

	// Define form steps dynamically based on selected contract type
	const totalSteps = currentTypeConfig?.steps || 10;
	const stepTitles = currentTypeConfig?.stepTitles || [
		"Upload File",
		"Contract Basics",
		"Parties & Contacts",
		"Financials",
		"Risk & Compliance",
		"Workflow & Approvals",
		"Notifications",
		"Documents & Metadata",
		"Legal & Governance",
		"Digital Signatures",
	];

	type ContractFormData = z.infer<typeof contractSchema>;

	const form = useForm<ContractFormData>({
		resolver: zodResolver(contractSchema) as any,
		mode: "onSubmit",
		defaultValues: {
			contractName: "",
			contractType: "",
			lifecycleStatus: "draft",
			contractNumber: "",
			description: "",
			assignToDepartment: "",
			businessUnit: "",
			subDepartment: "",
			departmentOwner: "",
			contractOwnerId: ownerId,
			startDate: undefined,
			executionDate: undefined,
			expiryDate: undefined,
			autoRenew: false,
			renewalNoticeDays: "60",
			amount: "",
			currencyCode: "USD",
			notToExceedAmount: "",
			paymentTerms: "net_30",
			paymentSchedule: "",
			budgetCode: "",
			costCenter: "",
			riskLevel: "medium",
			counterpartyLegalName: "",
			counterpartyContactName: "",
			counterpartyContactTitle: "",
			counterpartyContactEmail: "",
			counterpartyContactPhone: "",
			counterpartyAddress: "",
			counterpartyType: "",
			counterpartyTaxId: "",
			counterpartyDunsNumber: "",
			insuranceRequired: false,
			insuranceVerifiedDate: undefined,
			insuranceExpiryDate: undefined,
			insuranceCoveragePerIncident: "",
			insuranceCoverageAggregate: "",
			indemnificationIncluded: false,
			hipaaRequired: false,
			dataPrivacyRequirements: "",
			backgroundCheckRequired: false,
			regulatoryRequirements: "",
			auditRightsGranted: false,
			versionNumber: "",
			templateUsed: "",
			parentContractId: "",
			relatedDocumentIds: "",
			attachmentReferences: "",
			businessPurpose: "",
			tags: "",
			keyObligations: "",
			serviceLevelAgreements: "",
			performanceMetrics: "",
			reportingRequirements: "",
			postTerminationObligations: "",
			terminationNoticeDays: "",
			terminationRights: "",
			curePeriodDays: "",
			riskMitigationPlan: "",
			milestones: "",
			deliverables: "",
			slaPenalties: "",
			serviceCreditTerms: "",
			escalationProcedures: "",
			obligationOwners: "",
			approvalWorkflowTemplate: "",
			currentApprovalStage: "",
			reviewerComments: "",
			assignedManagers: [],
			internalApproverIds: [],
			approvalDueDate: undefined,
			approvalEscalationContactIds: "",
			workflowNotes: "",
			alertRecipientIds: "",
			alertEscalationContactIds: "",
			alertLeadTimes: "30,60,90",
			alertChannels: "email",
			alertNotes: "",
			alertStrategy: "standard",
			primaryInternalContactId: "",
			secondaryInternalContactId: "",
			erpReference: "",
			crmReference: "",
			projectMatterId: "",
			governingLaw: "Florida",
			jurisdiction: "Miami-Dade County, FL",
			disputeResolutionMethod: "mediation",
			confidentialityClassification: "internal",
			recordsRetentionPeriodMonths: "84",
			searchKeywords: "",
			digitalSignatureRequired: false,
			digitalSignatureStatus: "not_started",
			digitalSignaturePlatform: "",
			digitalSignatureCompletedAt: undefined,
			digitalSignatureEnvelopeId: "",
			signatureRecipientIds: "",
			visibilityRoles: "",
			accessScope: "organization",
		},
	});

	// Fetch managers when dialog opens (deferred loading for performance)
	useEffect(() => {
		if (isOpen && availableManagers.length === 0) {
			const fetchManagers = async () => {
				try {
					const managers = await getAllManagers();
					if (managers) {
						const typedManagers = managers.map(
							(manager: {
								$id: string;
								fullName?: string;
								email?: string;
								division?: string;
							}) => ({
								$id: manager.$id,
								fullName: manager.fullName || "Unknown",
								email: manager.email || "",
								division: manager.division,
							}),
						);
						setAvailableManagers(typedManagers);
						setFilteredManagers([]);
					}
				} catch (error) {
					console.error("Failed to fetch managers:", error);
				}
			};
			fetchManagers();
		}
	}, [isOpen, availableManagers.length]);

	// Filter managers when assignToDepartment changes
	const watchedAssignToDepartment = form.watch("assignToDepartment");
	useEffect(() => {
		if (watchedAssignToDepartment) {
			// Fetch managers for the selected department
			const fetchDepartmentManagers = async () => {
				try {
					const departmentManagers = await getUsersByDepartment(
						watchedAssignToDepartment,
					);
					if (departmentManagers && departmentManagers.length > 0) {
						const typedManagers = departmentManagers.map(
							(manager: {
								$id: string;
								fullName?: string;
								email?: string;
								division?: string;
							}) => ({
								$id: manager.$id,
								fullName: manager.fullName || "Unknown",
								email: manager.email || "",
								division: manager.division,
							}),
						);
						setFilteredManagers(typedManagers);
						// Clear selected managers when department changes
						setSelectedManagers([]);
						form.setValue("assignedManagers", []);
					} else {
						// No managers found in this department
						setFilteredManagers([]);
						// Clear selected managers when no managers found
						setSelectedManagers([]);
						form.setValue("assignedManagers", []);
					}
				} catch (error) {
					console.error("Failed to fetch department managers:", error);
					// Fallback to empty array if department filtering fails
					setFilteredManagers([]);
				}
			};
			fetchDepartmentManagers();
		} else {
			// If no department is selected, show no managers
			setFilteredManagers([]);
			// Clear selected managers when no department is selected
			setSelectedManagers([]);
			form.setValue("assignedManagers", []);
		}
	}, [watchedAssignToDepartment, form]);

	// Synchronous file processing function
	const processFileSynchronously = useCallback(
		(file: File): Promise<ProcessedFileData> => {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();

				reader.onload = (event) => {
					try {
						const arrayBuffer = event.target?.result as ArrayBuffer;
						const base64Content = btoa(
							new Uint8Array(arrayBuffer).reduce(
								(data, byte) => data + String.fromCharCode(byte),
								"",
							),
						);

						const processedData: ProcessedFileData = {
							name: file.name,
							type: file.type,
							size: file.size,
							base64Content,
							arrayBuffer,
							lastModified: file.lastModified,
						};

						resolve(processedData);
					} catch (error) {
						reject(error);
					}
				};

				reader.onerror = () => reject(new Error("File reading failed"));
				reader.readAsArrayBuffer(file);
			});
		},
		[],
	);

	const extractContractData = useCallback(
		async (
			fileData: ProcessedFileData,
		): Promise<Record<string, unknown> | null> => {
			try {
				console.log("=== EXTRACT CONTRACT DATA START ===");
				console.log("Starting contract data extraction for file:", fileData.name);
				console.log("File type:", fileData.type);
				console.log("File size:", fileData.size);
				console.log("Base64 content length:", fileData.base64Content.length);

				const requestBody = {
					fileName: fileData.name,
					fileType: fileData.type,
					fileSize: fileData.size,
					fileContent: fileData.base64Content,
				};

				console.log("Request body prepared, making API call...");
				console.log("Making request to /api/contracts/extract-data");

				const response = await fetch("/api/contracts/extract-data", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				});

				console.log("Response received, status:", response.status);
				console.log(
					"Response headers:",
					Object.fromEntries(response.headers.entries()),
				);

				if (!response.ok) {
					console.error("Response not OK, attempting to read error...");

					const responseClone = response.clone();

					let errorData;
					try {
						errorData = await responseClone.json();
						console.error("Error data (JSON):", errorData);
					} catch {
						console.error("Failed to parse error as JSON, trying text...");
						try {
							const textContent = await response.text();
							console.error("Response text content:", textContent);
							throw new Error(
								`HTTP ${response.status}: ${textContent.substring(0, 200)}`,
							);
						} catch (textError) {
							console.error("Failed to read response text:", textError);
							throw new Error(
								`HTTP ${response.status}: Unable to read error response`,
							);
						}
					}
					console.error("Extraction failed:", errorData);
					throw new Error(
						errorData.error || `HTTP ${response.status}: Extraction failed`,
					);
				}

				console.log("Response OK, parsing JSON...");
				const result = await response.json();
				console.log("Extraction result:", result);

				if (result.success && result.data) {
					console.log("=== EXTRACT CONTRACT DATA SUCCESS ===");
					return result.data;
				}
				console.error("Unexpected response structure:", result);
				console.log(
					"=== EXTRACT CONTRACT DATA FAILED - UNEXPECTED STRUCTURE ===",
				);
				return null;
			} catch (error) {
				console.error("=== EXTRACT CONTRACT DATA ERROR ===");
				console.error("Contract data extraction error:", error);
				console.error(
					"Error stack:",
					error instanceof Error ? error.stack : "No stack trace",
				);
				return null;
			}
		},
		[],
	);

	// Reset function to clear all form data and file
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
		setCurrentDraftId(null);
		setSelectedContractType(null);
		setShowTypeSelection(true);
		setShowAiQuiz(false);
		setAiQuizStep(0);
		setAiQuizAnswers({});
		setAiSuggestedTypeId(null);
		setAiQuizPhase("questions");
		setAiQuizDirection("forward");
	}, [form]);

	// Handle contract type selection
	const handleContractTypeSelect = useCallback(
		(typeId: string) => {
			setSelectedContractType(typeId);
			setShowTypeSelection(false);
			setCurrentStep(1);

			// Set contractType in form
			const config = getContractTypeConfig(typeId);
			if (config) {
				form.setValue("contractType", config.label);
			}
		},
		[form],
	);

	// Get icon component for contract type
	const getIconComponent = (iconName: string) => {
		const icons: Record<string, any> = {
			Briefcase,
			Package,
			Gift,
			Building2,
			Home,
			Users,
			Handshake,
			Heart,
			UserCheck,
			Shield,
		};
		return icons[iconName] || FileText;
	};

	// Step validation - defines required fields for each step (type-aware)
	const getRequiredFieldsForStep = (step: number): string[] => {
		// If contract type is selected, use type-specific required fields
		if (selectedContractType && currentTypeConfig) {
			const fieldsForStep = getFieldsForStep(selectedContractType, step) || [];
			const requiredFields = getRequiredFields(selectedContractType);

			// Return intersection of fields in this step and required fields
			return fieldsForStep.filter((field) => requiredFields.includes(field));
		}

		// Fallback to static validation for legacy/default behavior
		switch (step) {
			case 1: // File Upload - file required
				return []; // Handled separately by processedFileData check
			case 2: // Contract Basics
				return [
					"contractName",
					"contractType",
					"lifecycleStatus",
					"contractNumber",
					"assignToDepartment",
					"expiryDate",
				];
			case 3: // Parties & Contacts
				return ["counterpartyLegalName"];
			case 4: // Financials
				return ["amount", "currencyCode", "riskLevel"];
			case 5: // Risk & Compliance - no required fields by default
				return [];
			case 6: // Workflow & Approvals - no required fields
				return [];
			case 7: // Notifications - no required fields
				return [];
			case 8: // Documents & Metadata - no required fields
				return [];
			case 9: // Legal & Governance - no required fields
				return [];
			case 10: // Digital Signatures - no required fields
				return [];
			default:
				return [];
		}
	};

	// Validate current step before proceeding
	const validateStep = async (step: number): Promise<boolean> => {
		const requiredFields = getRequiredFieldsForStep(step);

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

	// Step navigation functions
	const nextStep = async () => {
		if (currentStep < totalSteps) {
			// Validate current step before proceeding
			const isValid = await validateStep(currentStep);
			if (isValid) {
				setCurrentStep((prev) => prev + 1);
			}
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

	// File drop handling with synchronous processing
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
									? (() => {
											// Parse date string as local date to avoid timezone issues
											const dateStr = extracted.expiryDate as string;
											const dateOnlyMatch = dateStr.match(
												/^(\d{4})-(\d{2})-(\d{2})/,
											);
											if (dateOnlyMatch) {
												const [, year, month, day] = dateOnlyMatch;
												// Create date in local timezone (month is 0-indexed)
												return new Date(
													parseInt(year, 10),
													parseInt(month, 10) - 1,
													parseInt(day, 10),
												);
											}
											// Fallback for ISO strings
											const isoMatch = dateStr.match(
												/^(\d{4})-(\d{2})-(\d{2})T/,
											);
											if (isoMatch) {
												const [, year, month, day] = isoMatch;
												return new Date(
													parseInt(year, 10),
													parseInt(month, 10) - 1,
													parseInt(day, 10),
												);
											}
											// Last resort: use standard Date parsing
											return new Date(dateStr);
										})()
									: undefined,
								startDate: extracted.startDate
									? (() => {
											// Parse date string as local date to avoid timezone issues
											const dateStr = extracted.startDate as string;
											const dateOnlyMatch = dateStr.match(
												/^(\d{4})-(\d{2})-(\d{2})/,
											);
											if (dateOnlyMatch) {
												const [, year, month, day] = dateOnlyMatch;
												return new Date(
													parseInt(year, 10),
													parseInt(month, 10) - 1,
													parseInt(day, 10),
												);
											}
											const isoMatch = dateStr.match(
												/^(\d{4})-(\d{2})-(\d{2})T/,
											);
											if (isoMatch) {
												const [, year, month, day] = isoMatch;
												return new Date(
													parseInt(year, 10),
													parseInt(month, 10) - 1,
													parseInt(day, 10),
												);
											}
											return new Date(dateStr);
										})()
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
						// Continue with manual input if extraction fails
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
		[form, processFileSynchronously, toast, extractContractData],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/pdf": [".pdf"],
			"application/msword": [".doc"],
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				[".docx"],
			"text/plain": [".txt"],
		},
		multiple: false,
	});

	const parseCurrencyInput = (value?: string) => {
		if (!value) return undefined;
		const numeric = parseFloat(value.replace(/[$,]/g, ""));
		return Number.isFinite(numeric) ? numeric : undefined;
	};

	const parseIntegerInput = (value?: string) => {
		if (!value?.trim()) return undefined;
		const numeric = Number(value.trim());
		return Number.isFinite(numeric) ? numeric : undefined;
	};

	const parseListInput = (value?: string) =>
		value
			? value
					.split(/[\n,]/)
					.map((entry) => entry.trim())
					.filter(Boolean)
			: [];

	const sanitizeString = (value?: string) =>
		value && value.trim().length > 0 ? value.trim() : undefined;

	// Auto-save draft
	const autoSaveDraft = useCallback(async (): Promise<boolean> => {
		if (isResumingDraftRef.current) {
			return false; // Don't save while resuming a draft
		}
		// Don't save to database until user progresses to step 2
		if (currentStep === 1) {
			return false; // Don't save on step 1 - wait until step 2
		}
		if (!processedFileData) {
			return false; // Don't save if no file uploaded
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
					selectedContractType, // Save contract type selection
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
		selectedContractType,
	]);

	// Manual save function
	const handleManualSave = useCallback(async () => {
		// Don't allow saving on step 1 - user must progress to step 2 first
		if (currentStep === 1) {
			toast({
				title: "Cannot save on step 1",
				description: "Please progress to step 2 before saving your progress",
				variant: "destructive",
			});
			return;
		}
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
	}, [autoSaveDraft, currentStep, processedFileData, toast, resetForm]);

	// Handle cancel click - show confirmation dialog
	const handleCancelClick = useCallback(() => {
		setCancelDialogOpen(true);
	}, []);

	// Handle cancel confirmation - delete current draft and reset
	const handleCancelConfirm = useCallback(async () => {
		// If there's a current draft, delete it from database and list
		if (currentDraftId) {
			try {
				const response = await fetch(
					`/api/contracts/drafts?draftId=${currentDraftId}`,
					{
						method: "DELETE",
					},
				);
				if (response.ok) {
					// Remove from saved drafts list
					setSavedDrafts((prev) =>
						prev.filter((d) => d.$id !== currentDraftId),
					);
				}
			} catch (error) {
				console.error("Error deleting draft on cancel:", error);
				// Continue with cancel even if delete fails
			}
		}

		// Close dialog, reset form, and clear draft ID
		setIsOpen(false);
		resetForm();
		setCurrentDraftId(null);
		setCancelDialogOpen(false);
	}, [resetForm, currentDraftId]);

	// Load saved drafts
	const loadSavedDrafts = useCallback(async () => {
		try {
			if (!ownerId) {
				console.warn("Cannot load drafts: ownerId is missing");
				return;
			}

			const response = await fetch(`/api/contracts/drafts?ownerId=${ownerId}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include", // Include cookies for authentication
			});

			if (response.ok) {
				const result = await response.json();
				// Handle both old and new response formats
				const drafts = result.data?.drafts || result.drafts || [];
				setSavedDrafts(drafts);
			} else {
				// Try to parse error response
				let errorData: any = {};
				let errorText = "";

				try {
					errorText = await response.text();
					if (errorText) {
						try {
							errorData = JSON.parse(errorText);
						} catch (_parseError) {
							// If JSON parsing fails, use the raw text
							errorData = { error: errorText, raw: errorText };
						}
					}
				} catch (textError) {
					console.error("Failed to read error response text:", textError);
					errorData = { error: "Failed to read error response" };
				}

				// Log detailed error information
				const errorMessage =
					errorData.error ||
					errorData.message ||
					errorData.raw ||
					"Unknown error";
				console.error("Failed to load drafts:", {
					status: response.status,
					statusText: response.statusText,
					error: errorMessage,
					fullError: errorData,
					rawResponse: errorText,
					ownerId: ownerId,
					url: `/api/contracts/drafts?ownerId=${ownerId}`,
				});

				// Show user-friendly error message
				if (response.status === 401) {
					console.warn("Authentication failed - user may not be logged in");
				} else if (response.status === 403) {
					console.warn("Access denied - user may not have permission");
				} else if (response.status === 400) {
					console.warn("Validation error - check ownerId parameter");
				}
			}
		} catch (error) {
			console.error("Error loading saved drafts:", error);
		}
	}, [ownerId]);

	// Resume a draft
	const resumeDraft = useCallback(
		async (draft: any) => {
			try {
				// Set flag to prevent auto-save during resume
				isResumingDraftRef.current = true;

				// Restore contract type selection
				if (draft.selectedContractType) {
					setSelectedContractType(draft.selectedContractType);
					setShowTypeSelection(false);
				}

				// Parse form data if it's a string (should already be parsed from API, but safe check)
				let parsedFormData = draft.formData;
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
						const value = parsedFormData[key];
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
					setProcessedFileData(draft.processedFileData);
				}
				if (draft.extractedData) {
					setExtractedData(draft.extractedData);
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
		[form, toast],
	);

	// Delete a draft (with confirmation)
	const handleDeleteClick = useCallback((draftId: string) => {
		setDraftToDelete(draftId);
		setDeleteDialogOpen(true);
	}, []);

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

	// Auto-save on step change (only after step 2)
	useEffect(() => {
		if (isResumingDraftRef.current) {
			return; // Don't auto-save while resuming a draft
		}
		// Only auto-save when user has progressed to step 2 or beyond
		if (currentStep > 1 && processedFileData) {
			const timeout = setTimeout(() => {
				if (!isResumingDraftRef.current) {
					autoSaveDraft();
				}
			}, 2000); // Save 2 seconds after step change
			return () => clearTimeout(timeout);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentStep, autoSaveDraft, processedFileData]);

	// Auto-save when dialog is about to close (only if user has progressed to step 2)
	useEffect(() => {
		// Only save to database if user has progressed to step 2 or beyond
		if (!isOpen && currentStep > 1 && processedFileData) {
			// Save draft when dialog closes (silent save, no toast)
			const saveOnClose = async () => {
				try {
					const formValues = form.getValues();
					await fetch("/api/contracts/drafts", {
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
						}),
					});
				} catch (error) {
					console.error("Error saving draft on close:", error);
				}
			};
			saveOnClose();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isOpen,
		ownerId,
		processedFileData,
		form.getValues,
		extractedData,
		currentStep,
		accountId,
	]);

	// Reset form and load drafts when dialog opens (unless resuming a draft)
	useEffect(() => {
		if (isOpen) {
			// Only reset if we're not currently resuming a draft
			if (!isResumingDraftRef.current) {
				// Reset form to initial state when opening fresh
				resetForm();
				setCurrentDraftId(null);
			}
			loadSavedDrafts();
		}
	}, [isOpen, loadSavedDrafts, resetForm]);

	// Removed auto-save on form field changes to prevent infinite loops
	// Auto-save now only happens on step changes and dialog close

	// Handle form submission using cached file data
	const handleSubmit = async (values: z.infer<typeof contractSchema>) => {
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
				selectedContractType: selectedContractType || undefined,
				grantTerms: sanitizeString(values.grantTerms),
				donorRestrictions: sanitizeString(values.donorRestrictions),
				projectDescription: sanitizeString(values.projectDescription),
				propertyDescription: sanitizeString(values.propertyDescription),
				// Store dates as date-only strings (YYYY-MM-DD) to avoid timezone issues
				// Normalize the date to extract local date components, not UTC
				contractExpiryDate: values.expiryDate
					? (() => {
							// Normalize to midnight local time to avoid timezone shifts
							const normalized = new Date(
								values.expiryDate.getFullYear(),
								values.expiryDate.getMonth(),
								values.expiryDate.getDate(),
							);
							// Extract date components from normalized date (ensures local timezone)
							const year = normalized.getFullYear();
							const month = String(normalized.getMonth() + 1).padStart(2, "0");
							const day = String(normalized.getDate()).padStart(2, "0");
							return `${year}-${month}-${day}`;
						})()
					: undefined,
				startDate: values.startDate
					? (() => {
							// Normalize to midnight local time to avoid timezone shifts
							const normalized = new Date(
								values.startDate.getFullYear(),
								values.startDate.getMonth(),
								values.startDate.getDate(),
							);
							const year = normalized.getFullYear();
							const month = String(normalized.getMonth() + 1).padStart(2, "0");
							const day = String(normalized.getDate()).padStart(2, "0");
							return `${year}-${month}-${day}`;
						})()
					: undefined,
				executionDate: values.executionDate
					? (() => {
							// Normalize to midnight local time to avoid timezone shifts
							const normalized = new Date(
								values.executionDate.getFullYear(),
								values.executionDate.getMonth(),
								values.executionDate.getDate(),
							);
							const year = normalized.getFullYear();
							const month = String(normalized.getMonth() + 1).padStart(2, "0");
							const day = String(normalized.getDate()).padStart(2, "0");
							return `${year}-${month}-${day}`;
						})()
					: undefined,
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
				// Store as date-only strings (YYYY-MM-DD) to avoid timezone issues
				insuranceVerifiedDate: values.insuranceVerifiedDate
					? values.insuranceVerifiedDate.toISOString().split("T")[0]
					: undefined,
				insuranceExpiryDate: values.insuranceExpiryDate
					? values.insuranceExpiryDate.toISOString().split("T")[0]
					: undefined,
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
			await uploadFile({
				file: fileForUpload,
				ownerId,
				accountId,
				path: path || "/",
				contractMetadata: {
					...contractPayload,
					enterpriseMetadata,
				},
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
				await loadSavedDrafts();
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

			// Reset form completely before closing
			resetForm();
			setCurrentDraftId(null);
			setIsOpen(false);

			// Clear the resume flag to ensure next open is fresh
			isResumingDraftRef.current = false;

			// Navigate to contracts page after successful upload
			router.push("/contracts");

			onSuccess?.();
		} catch (error) {
			console.error("Upload failed:", error);
			toast({
				title: "Upload Failed",
				description: "Failed to upload contract. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				setIsOpen(open);
				if (!open) {
					// Reset form when dialog closes
					resetForm();
					isResumingDraftRef.current = false;
				} else {
					// Reset form when dialog opens (unless resuming a draft)
					if (!isResumingDraftRef.current) {
						resetForm();
					}
				}
			}}
		>
			<DialogTrigger asChild>
				<Button
					className={cn(
						"primary-btn h-10 px-4 shadow-drop-1 text-sm gap-2",
						className,
					)}
				>
					<FileText className="h-4 w-4" />
					Upload Contract
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-4xl p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl bg-white rounded-[26px]">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>Upload Contract</DialogTitle>
				</VisuallyHiddenPrimitive.Root>

				{/* Professional Cap */}
				<div className="h-4 w-full bg-[#d6d7d8] opacity-70 rounded-t-[26px]" />

				{/* Contract Type Selection Screen */}
				{showTypeSelection && !selectedContractType && !showAiQuiz ? (
					<div className="flex-1 overflow-y-auto">
						{/* Header */}
						<div className="sticky top-0 z-10 bg-linear-to-r from-blue-50 to-indigo-50 py-6 border-b border-slate-200">
							<div className="px-6">
								<h2 className="text-2xl font-semibold sidebar-gradient-text mb-2">
									Select Contract Type
								</h2>
								<p className="text-sm text-slate-600">
									Choose the type of contract you want to upload. This will
									customize the form fields to match your specific contract
									requirements.
								</p>
							</div>
						</div>

						{/* Contract Type Cards Grid */}
						<div className="p-6 bg-slate-50">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{CONTRACT_TYPE_CONFIGS.map((type) => {
									const IconComponent = getIconComponent(type.icon);
									return (
										<Card
											key={type.id}
											className="glass-card cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
											onClick={() => handleContractTypeSelect(type.id)}
										>
											<div className="glass-card-cap" />
											<CardContent className="p-4 sm:p-6">
												<IconComponent className="h-8 w-8 text-[#0f5384] mb-3" />
												<h3 className="text-lg font-semibold sidebar-gradient-text mb-2">
													{type.label}
												</h3>
												<p className="text-sm text-slate-600 mb-3">
													{type.description}
												</p>
												<div className="flex items-center justify-between text-xs text-slate-500">
													<span>{type.steps} steps</span>
													<span>→</span>
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>
						</div>

						{/* Footer */}
						<div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200">
							<div className="flex items-center justify-between">
								<p className="text-sm text-slate-500 flex items-center justify-center gap-2">
									Need help? Use CAALM AI Assistant to select the contract type
									that best fits your needs.
									<span>→</span>
									<Image
										role="button"
										tabIndex={0}
										onClick={() => setShowAiQuiz(true)}
										onKeyDown={(e) => e.key === "Enter" && setShowAiQuiz(true)}
										className="cursor-pointer"
										src="/assets/icons/ai-icon.svg"
										alt="AI Icon"
										width={25}
										height={25}
									/>
								</p>
								<Button
									variant="outline"
									onClick={() => setIsOpen(false)}
									className="primary-btn px-3 sm:px-4"
								>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				) : showAiQuiz ? (
					/* AI Quiz View */
					<div className="flex-1 overflow-y-auto flex flex-col">
						{/* Header */}
						<div className="sticky top-0 z-10 bg-linear-to-r from-blue-50 to-indigo-50 py-6 border-b border-slate-200">
							<div className="px-6">
								<button
									type="button"
									onClick={() => {
										setShowAiQuiz(false);
										setAiQuizStep(0);
										setAiQuizAnswers({});
										setAiSuggestedTypeId(null);
										setAiQuizPhase("questions");
										setAiQuizDirection("forward");
									}}
									className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0f5384] mb-2"
								>
									<ChevronLeft className="h-4 w-4" />
									Back
								</button>
								<h2 className="text-2xl font-semibold sidebar-gradient-text mb-2">
									CAALM AI Assistant
								</h2>
								<p className="text-sm text-slate-600">
									Answer a few questions to find the best contract type for your
									needs.
								</p>
							</div>
						</div>

						{/* Quiz Content */}
						<div className="flex p-6 items-center justify-center bg-slate-[f8fafc]">
							<AnimatePresence mode="wait">
								{aiQuizPhase === "questions" && (
									<motion.div
										key={`question-${aiQuizStep}`}
										initial={{
											opacity: 0,
											x: aiQuizDirection === "forward" ? 100 : -100,
										}}
										animate={{ opacity: 1, x: 0 }}
										exit={{
											opacity: 0,
											x: aiQuizDirection === "forward" ? -100 : 100,
										}}
										transition={{ duration: 0.3 }}
										className="max-w-xl w-full"
									>
										{aiQuizStep < AI_QUIZ_QUESTIONS.length ? (
											<>
												<h3 className="text-lg font-semibold sidebar-gradient-text mb-4">
													{AI_QUIZ_QUESTIONS[aiQuizStep].text}
												</h3>
												<div className="space-y-3">
													{AI_QUIZ_QUESTIONS[aiQuizStep].options.map((opt) => (
														<button
															key={opt.value}
															type="button"
															onClick={() => {
																const q = AI_QUIZ_QUESTIONS[aiQuizStep];
																const newAnswers = {
																	...aiQuizAnswers,
																	[q.id]: opt.value,
																};
																setAiQuizAnswers(newAnswers);
																if (aiQuizStep < AI_QUIZ_QUESTIONS.length - 1) {
																	setAiQuizDirection("forward");
																	setAiQuizStep((s) => s + 1);
																} else {
																	setAiQuizPhase("loading");
																	const answersForApi = Object.entries(
																		newAnswers,
																	).map(([questionId, answer]) => ({
																		questionId,
																		answer,
																	}));
																	Promise.all([
																		fetch("/api/ai-contract-type-suggest", {
																			method: "POST",
																			headers: {
																				"Content-Type": "application/json",
																			},
																			body: JSON.stringify({
																				answers: answersForApi,
																			}),
																		})
																			.then((r) => r.json())
																			.catch(() => ({ typeId: "vendor" })),
																		new Promise((resolve) =>
																			setTimeout(resolve, 10000),
																		),
																	]).then(([res]) => {
																		const typeId = res?.typeId ?? "vendor";
																		setAiSuggestedTypeId(typeId);
																		setAiQuizPhase("result");
																	});
																}
															}}
															className="w-full text-left text-slate-700 p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
														>
															{opt.label}
														</button>
													))}
												</div>
											</>
										) : null}
									</motion.div>
								)}

								{aiQuizPhase === "loading" && (
									<motion.div
										key="loading"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="flex flex-col items-center justify-center py-12"
									>
										<video
											autoPlay
											loop
											muted
											playsInline
											preload="auto"
											className="w-[200px] h-[150px] rounded-lg object-contain"
										>
											<source
												src="/assets/video/doc-upload.mp4"
												type="video/mp4"
											/>
										</video>
										<p className="text-sm text-slate-600 mt-4">
											Finding the best contract type...
										</p>
									</motion.div>
								)}

								{aiQuizPhase === "result" && aiSuggestedTypeId && (
									<motion.div
										key="result"
										initial={{ opacity: 0, x: 100 }}
										animate={{ opacity: 1, x: 0 }}
										className="max-w-xl"
									>
										<h3 className="text-lg font-semibold sidebar-gradient-text mb-4">
											Suggested contract type
										</h3>
										{(() => {
											const config =
												getContractTypeConfig(aiSuggestedTypeId) ??
												getContractTypeConfig("vendor");
											if (!config) return null;
											const IconComponent = getIconComponent(config.icon);
											return (
												<Card
													className="glass-card cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
													onClick={() => {
														handleContractTypeSelect(config.id);
														setShowAiQuiz(false);
														setAiQuizStep(0);
														setAiQuizAnswers({});
														setAiSuggestedTypeId(null);
														setAiQuizPhase("questions");
														setAiQuizDirection("forward");
													}}
												>
													<div className="glass-card-cap" />
													<CardContent className="p-4 sm:p-6">
														<IconComponent className="h-8 w-8 text-[#0f5384] mb-3" />
														<h3 className="text-lg font-semibold sidebar-gradient-text mb-2">
															{config.label}
														</h3>
														<p className="text-sm text-slate-600 mb-3">
															{config.description}
														</p>
														<div className="flex items-center justify-between text-xs text-slate-500">
															<span>{config.steps} steps</span>
															<span>→</span>
														</div>
													</CardContent>
												</Card>
											);
										})()}
									</motion.div>
								)}
							</AnimatePresence>
						</div>

						{/* Footer */}
						<div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200">
							<div className="flex items-center justify-between">
								<div>
									{aiQuizPhase === "questions" && aiQuizStep > 0 && (
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setAiQuizDirection("back");
												setAiQuizStep((s) => s - 1);
											}}
											className="primary-btn px-3 sm:px-4"
										>
											<ChevronLeft className="h-4 w-4" />
											Previous
										</Button>
									)}
								</div>
								<Button
									variant="outline"
									onClick={() => setIsOpen(false)}
									className="primary-btn px-3 sm:px-4"
								>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				) : (
					<>
						{/* Sticky Header with gradient background */}
						<div className="sticky top-0 z-10 bg-[#f4f9fd] py-4 border-b border-slate-200">
							<div className="px-6">
								<div className="flex items-center gap-3 mb-3">
									<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
										<Upload className="w-5 h-5 text-[#0f5384]" />
									</div>
									{/* Title */}
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<h2 className="text-xl font-semibold sidebar-gradient-text">
												Upload Contract
											</h2>
											{selectedContractType && currentTypeConfig && (
												<Badge
													variant="outline"
													className="text-xs sidebar-gradient-text"
												>
													{currentTypeConfig.label}
												</Badge>
											)}
										</div>
										<div className="flex items-center justify-between">
											<p className="text-sm text-slate-600 mt-0.5">
												Step {currentStep} of {totalSteps}:{" "}
												{stepTitles[currentStep - 1]}
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

								{/* Progress Bar */}
								<div className="w-full bg-slate-200 rounded-full h-2">
									<div
										className="bg-linear-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
										style={{ width: `${(currentStep / totalSteps) * 100}%` }}
									/>
								</div>

								{/* Step Indicators */}
								<div className="flex items-center justify-between mt-3 gap-1">
									{stepTitles.map((title, index) => {
										const stepNum = index + 1;
										const isActive = stepNum === currentStep;
										const isCompleted = stepNum < currentStep;
										const isAccessible =
											stepNum === 1 ||
											processedFileData ||
											stepNum <= currentStep;
										const nextStepNum = index + 2;
										const isNextStepCompleted = nextStepNum < currentStep;
										const hasNextStep = index < stepTitles.length - 1;
										const showLine =
											isCompleted && hasNextStep && isNextStepCompleted;

										return (
											<React.Fragment key={stepNum}>
												<button
													type="button"
													onClick={() => isAccessible && goToStep(stepNum)}
													disabled={!isAccessible}
													className={cn(
														"flex-1 text-xs px-2 py-1 rounded-md transition-all flex items-center justify-center",
														isActive
															? "bg-[#e1f3ff] hover:bg-green/10 border border-[#a0c4db] text-[#6c8ba1] font-semibold"
															: isCompleted
																? "bg-green/10 text-green border-green/20"
																: isAccessible
																	? "bg-slate-100 text-slate-600 hover:bg-slate-200"
																	: "bg-slate-50 text-slate-400 cursor-not-allowed",
													)}
													title={title}
												>
													{isCompleted ? (
														<FileCheck className="h-6 w-6 text-green" />
													) : (
														<div className="truncate">{stepNum}</div>
													)}
												</button>
												{showLine && (
													<div
														className="shrink-0 rounded-full"
														style={{
															backgroundColor: "#3DD9B3",
															height: "0.5px",
															width: "40px",
															marginLeft: "-4px",
															marginRight: "-4px",
														}}
														aria-hidden="true"
													/>
												)}
											</React.Fragment>
										);
									})}
								</div>
							</div>
						</div>

						{/* Scrollable Content */}
						<div className="flex-1 overflow-y-auto p-4 bg-white">
							<Form {...form}>
								<form
									id="contract-upload-form"
									onSubmit={form.handleSubmit(handleSubmit)}
									className="space-y-6"
								>
									{/* Step 1: File Upload Section */}
									{currentStep === 1 && (
										<Card className="border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50">
											<CardHeader className="pb-4">
												<CardTitle className="text-lg font-semibold sidebar-gradient-text">
													1. Upload Contract File
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div
													{...getRootProps()}
													className={cn(
														"border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
														isDragActive
															? "border-brand bg-brand/5"
															: "border-light-200 hover:border-[#03B1C1] hover:bg-light-400",
													)}
												>
													<input {...getInputProps()} />
													<Upload className="mx-auto h-12 w-12 text-light-200 mb-4" />

													{processedFileData ? (
														<div className="space-y-2">
															<div className="flex items-center justify-center space-x-2">
																<FileText className="h-5 w-5 text-green" />
																<span className="font-medium text-navy">
																	{processedFileData.name}
																</span>
															</div>
															<p className="text-sm text-light-200">
																{(processedFileData.size / 1024 / 1024).toFixed(
																	2,
																)}{" "}
																MB
															</p>
														</div>
													) : (
														<div>
															<p className="text-lg font-medium text-navy">
																{isDragActive
																	? "Drop the contract here"
																	: "Drag & drop contract file here"}
															</p>
															<p className="text-sm text-light-200 mt-2">
																Supports PDF, DOC, DOCX, TXT (Max 50MB)
															</p>
														</div>
													)}

													{isExtracting && (
														<div className="mt-4 flex items-center justify-center space-x-2">
															<Loader2 className="h-4 w-4 animate-spin text-brand" />
															<span className="text-sm text-light-200">
																Extracting contract data...
															</span>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									)}

									{/* Saved Drafts List */}
									{currentStep === 1 && savedDrafts.length > 0 && (
										<Card className="border border-slate-200 shadow-sm rounded-lg bg-slate-50">
											<CardHeader className="pb-3">
												<CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
													<FileCheck className="h-4 w-4 text-green" />
													Saved Progress ({savedDrafts.length})
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-2">
													{savedDrafts.map((draft) => (
														<div
															key={draft.$id}
															className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
														>
															<div className="flex-1">
																<h3 className="text-sm font-medium text-slate-700 mb-1 max-w-[600px]">
																	{draft.formData?.contractName ||
																		"Untitled Contract"}
																</h3>
																<div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
																	<span>
																		Step {draft.currentStep}:{" "}
																		{stepTitles[draft.currentStep - 1]}
																	</span>
																	<span>•</span>
																	<span>
																		Saved{" "}
																		{new Date(
																			draft.lastSavedAt,
																		).toLocaleDateString()}
																	</span>
																</div>
																<Badge
																	variant="outline"
																	className="text-xs bg-green/10 text-green border-green/20 w-fit px-2.5 py-0.5"
																>
																	{draft.progressPercentage}% Complete
																</Badge>
															</div>
															<div className="flex items-center gap-2">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => resumeDraft(draft)}
																	className="primary-btn sm:px-4 px-3 shimmer-hover"
																>
																	<StepForward className="h-3 w-3" />
																	Resume
																</Button>
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => handleDeleteClick(draft.$id)}
																	className="primary-btn h-8 px-3"
																>
																	<Trash2 className="h-3 w-3" />
																	Delete
																</Button>
															</div>
														</div>
													))}
												</div>
											</CardContent>
										</Card>
									)}

									{/* Steps 2-10: Contract Details Sections */}
									{currentStep >= 2 && currentStep <= 10 && (
										<div className="">
											<div className="mb-4">
												<h3 className="text-lg font-semibold text-slate-700">
													{currentStep}. {stepTitles[currentStep - 1]}
												</h3>
											</div>
											<div className="space-y-6">
												{/* Step 2: Contract Basics & Timeline */}
												{currentStep === 2 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-1  gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="contractName"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Contract Title / Description{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="CFCE Provider Services Agreement"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="contractNumber"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Contract Number{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., KHME2-01-47"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
															<FormField
																control={form.control}
																name="contractType"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Contract Type{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select contract type" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{CONTRACT_TYPES.map((type) => (
																					<SelectItem key={type} value={type}>
																						{type}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="lifecycleStatus"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Lifecycle Status{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select status" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{LIFECYCLE_STATUSES.map((status) => (
																					<SelectItem
																						key={status.value}
																						value={status.value}
																					>
																						{status.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>
															<FormField
																control={form.control}
																name="attachmentReferences"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Attachment References
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Exhibit A, Attachment B..."
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="assignToDepartment"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Business Unit / Department{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<Select
																			onValueChange={(value) => {
																				field.onChange(value);
																			}}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select department" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{CONTRACT_DEPARTMENTS.map((dept) => (
																					<SelectItem key={dept} value={dept}>
																						{dept}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="businessUnit"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Business Unit
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., Behavioral Health"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="subDepartment"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Sub-Department
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., Clinic Ops"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="departmentOwner"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Department Owner
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Who is accountable?"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200"></div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="startDate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Start Date
																		</FormLabel>
																		<FormControl>
																			<DatePicker
																				selected={field.value}
																				onChange={(date: Date | null) => {
																					// Normalize the date to midnight local time to avoid timezone issues
																					if (date) {
																						const normalized = new Date(
																							date.getFullYear(),
																							date.getMonth(),
																							date.getDate(),
																						);
																						field.onChange(normalized);
																					} else {
																						field.onChange(undefined);
																					}
																				}}
																				dateFormat="MM/dd/yyyy"
																				className="w-full px-3 py-2 bg-white border-slate-300 rounded-md"
																				placeholderText="Select start date"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="executionDate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Execution Date
																		</FormLabel>
																		<FormControl>
																			<DatePicker
																				selected={field.value}
																				onChange={(date: Date | null) => {
																					// Normalize the date to midnight local time to avoid timezone issues
																					if (date) {
																						const normalized = new Date(
																							date.getFullYear(),
																							date.getMonth(),
																							date.getDate(),
																						);
																						field.onChange(normalized);
																					} else {
																						field.onChange(undefined);
																					}
																				}}
																				dateFormat="MM/dd/yyyy"
																				className="w-full px-3 py-2 bg-white border-slate-300 rounded-md"
																				placeholderText="Select execution date"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="expiryDate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Expiry Date{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<FormControl>
																			<Popover>
																				<PopoverTrigger asChild>
																					<Button
																						variant="outline"
																						className="w-full justify-start text-left font-normal bg-white border-slate-300"
																					>
																						<CalendarIcon className="mr-2 h-4 w-4" />
																						{field.value ? (
																							format(field.value, "PPP")
																						) : (
																							<span className="text-slate-500">
																								Select expiry date
																							</span>
																						)}
																					</Button>
																				</PopoverTrigger>
																				<PopoverContent
																					className="w-auto p-0"
																					align="start"
																				>
																					<Calendar
																						mode="single"
																						selected={field.value}
																						onSelect={(date) => {
																							// Normalize the date to midnight local time to avoid timezone issues
																							if (date) {
																								const normalized = new Date(
																									date.getFullYear(),
																									date.getMonth(),
																									date.getDate(),
																								);
																								field.onChange(normalized);
																							} else {
																								field.onChange(undefined);
																							}
																						}}
																						disabled={(date) => {
																							const today = new Date();
																							today.setHours(0, 0, 0, 0);
																							return date < today;
																						}}
																						initialFocus
																					/>
																				</PopoverContent>
																			</Popover>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="autoRenew"
																render={({ field }) => (
																	<FormItem className="space-y-2">
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Auto-Renew
																		</FormLabel>
																		<FormControl>
																			<Switch
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="renewalNoticeDays"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Renewal Notice (Days)
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., 60"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="description"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="shad-form-label">
																			Summary / Scope
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				placeholder="Summarize the work, deliverables, or obligations captured in this agreement"
																				rows={3}
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 3: Parties & Key Contacts */}
												{currentStep === 3 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="counterpartyLegalName"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Counterparty Legal Name{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Center for Family & Child Enrichment"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="counterpartyContactName"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Counterparty Contact Name
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Primary point of contact"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="counterpartyContactTitle"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Contact Title
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., Clinical Director"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="counterpartyContactEmail"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Contact Email
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="contact@example.com"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="counterpartyContactPhone"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Contact Phone
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="+1 (305) 555-0123"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="counterpartyType"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Counterparty Type
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select type" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{COUNTERPARTY_TYPES.map((type) => (
																					<SelectItem
																						key={type.value}
																						value={type.value}
																					>
																						{type.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="counterpartyTaxId"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Tax ID / EIN
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="12-3456789"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="counterpartyDunsNumber"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			DUNS Number
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="123456789"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-1 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="counterpartyAddress"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="shad-form-label">
																			Mailing Address
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Street, City, State, Zip"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="primaryInternalContactId"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Primary Internal Contact
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="User ID or email"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="secondaryInternalContactId"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Secondary Internal Contact
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="User ID or email"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 4: Financials & Payment Terms */}
												{currentStep === 4 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="amount"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Contract Amount{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Enter amount (e.g., $50,000)"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="currencyCode"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Currency{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select currency" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{CURRENCY_CODES.map((code) => (
																					<SelectItem key={code} value={code}>
																						{code}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="notToExceedAmount"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Not-to-Exceed Amount
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="$100,000 cap"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="paymentTerms"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Payment Terms
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select terms" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{PAYMENT_TERM_OPTIONS.map((option) => (
																					<SelectItem
																						key={option.value}
																						value={option.value}
																					>
																						{option.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="paymentSchedule"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Payment Schedule
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="How often is payment due?" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{PAYMENT_SCHEDULE_OPTIONS.map(
																					(option) => (
																						<SelectItem
																							key={option.value}
																							value={option.value}
																						>
																							{option.label}
																						</SelectItem>
																					),
																				)}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="budgetCode"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Budget Code
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="GL or project code"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="costCenter"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Cost Center
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Cost center reference"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="projectMatterId"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Project / Matter ID
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Optional reference"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="erpReference"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			ERP Reference
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="SAP / NetSuite ID"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="crmReference"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			CRM Reference
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="HubSpot / Salesforce ID"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 5: Risk & Compliance */}
												{currentStep === 5 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="riskLevel"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Risk Level{" "}
																			<span className="text-red">*</span>
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select risk level" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{RISK_LEVELS.map((level) => (
																					<SelectItem
																						key={level.value}
																						value={level.value}
																					>
																						{level.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="riskMitigationPlan"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Risk Mitigation Plan
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Outline monitoring or mitigation steps"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="insuranceRequired"
																render={({ field }) => (
																	<FormItem className="space-y-2">
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Insurance Required
																		</FormLabel>
																		<FormControl>
																			<Switch
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="insuranceCoveragePerIncident"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Coverage / Incident
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="$1,000,000"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="insuranceCoverageAggregate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Coverage Aggregate
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="$3,000,000"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="insuranceVerifiedDate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Insurance Verified On
																		</FormLabel>
																		<FormControl>
																			<DatePicker
																				selected={field.value}
																				onChange={(date: Date | null) =>
																					field.onChange(date)
																				}
																				dateFormat="MM/dd/yyyy"
																				className="w-full px-3 py-2 bg-white border-slate-300 rounded-md"
																				placeholderText="Verification date"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="insuranceExpiryDate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Insurance Expiration
																		</FormLabel>
																		<FormControl>
																			<DatePicker
																				selected={field.value}
																				onChange={(date: Date | null) =>
																					field.onChange(date)
																				}
																				dateFormat="MM/dd/yyyy"
																				className="w-full px-3 py-2 bg-white border-slate-300 rounded-md"
																				placeholderText="Expiration date"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="indemnificationIncluded"
																render={({ field }) => (
																	<FormItem className="space-y-2">
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Indemnification Included
																		</FormLabel>
																		<FormControl>
																			<Switch
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="hipaaRequired"
																render={({ field }) => (
																	<FormItem className="space-y-2">
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			HIPAA / Data Privacy Required
																		</FormLabel>
																		<FormControl>
																			<Switch
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="backgroundCheckRequired"
																render={({ field }) => (
																	<FormItem className="space-y-2">
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Background Check Required
																		</FormLabel>
																		<FormControl>
																			<Switch
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="auditRightsGranted"
																render={({ field }) => (
																	<FormItem className="space-y-2">
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Audit Rights Granted
																		</FormLabel>
																		<FormControl>
																			<Switch
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<FormField
															control={form.control}
															name="dataPrivacyRequirements"
															render={({ field }) => (
																<FormItem>
																	<FormLabel className="shad-form-label">
																		Data Privacy Requirements
																	</FormLabel>
																	<FormControl>
																		<Textarea
																			rows={2}
																			placeholder="List HIPAA, PHI, GDPR or other data clauses"
																			{...field}
																			className="bg-white border-slate-300 resize-none"
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name="regulatoryRequirements"
															render={({ field }) => (
																<FormItem>
																	<FormLabel className="shad-form-label">
																		Regulatory Requirements
																	</FormLabel>
																	<FormControl>
																		<Textarea
																			rows={2}
																			placeholder="DCF, Thriving Mind, CMS or other regulators"
																			{...field}
																			className="bg-white border-slate-300 resize-none"
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="keyObligations"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Key Obligations (one per line)
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={3}
																				placeholder="Enter obligations separated by newline or comma"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="serviceLevelAgreements"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Service Level Agreements
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={3}
																				placeholder="Document uptime, response or care metrics"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="performanceMetrics"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Performance Metrics
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="KPIs or benchmarks"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="reportingRequirements"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Reporting Requirements
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Monthly metrics, fiscal or progress reports"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="terminationNoticeDays"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Termination Notice (Days)
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., 60"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="terminationRights"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Termination Rights
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="For cause, for convenience, both..."
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="curePeriodDays"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Cure Period (Days)
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., 10"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="milestones"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Key Milestones
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Add one milestone per line"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="deliverables"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Deliverables
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="List deliverables per line"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="slaPenalties"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			SLA Penalties
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Describe penalties or service credits"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="serviceCreditTerms"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Service Credit Terms
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Reference how credits are calculated"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="escalationProcedures"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Escalation Procedures
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Detail escalation flow or SLAs"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="obligationOwners"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Obligation Owners
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="List owners separated by newline"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 6: Workflow, Ownership & Approvals */}
												{currentStep === 6 && (
													<div className="space-y-4">
														<FormField
															control={form.control}
															name="assignedManagers"
															render={({ field }) => (
																<FormItem>
																	<FormLabel className="shad-form-label">
																		Assign To Manager(s)
																	</FormLabel>
																	<div className="space-y-2">
																		<div className="max-h-40 overflow-y-auto border border-slate-300 rounded-md bg-white p-2">
																			{filteredManagers.length > 0 ? (
																				filteredManagers.map((manager) => (
																					<div
																						key={manager.$id}
																						className="flex items-center space-x-2 p-2 hover:bg-white/20 rounded cursor-pointer"
																						onClick={() => {
																							const newSelection =
																								selectedManagers.includes(
																									manager.$id,
																								)
																									? selectedManagers.filter(
																											(id) =>
																												id !== manager.$id,
																										)
																									: [
																											...selectedManagers,
																											manager.$id,
																										];
																							setSelectedManagers(newSelection);
																							field.onChange(newSelection);
																						}}
																					>
																						<input
																							type="checkbox"
																							checked={selectedManagers.includes(
																								manager.$id,
																							)}
																							onChange={() => {
																								const newSelection =
																									selectedManagers.includes(
																										manager.$id,
																									)
																										? selectedManagers.filter(
																												(id) =>
																													id !== manager.$id,
																											)
																										: [
																												...selectedManagers,
																												manager.$id,
																											];
																								setSelectedManagers(
																									newSelection,
																								);
																								field.onChange(newSelection);
																							}}
																							className="cursor-pointer"
																						/>
																						<span className="text-sm text-slate-700">
																							{manager.fullName} (
																							{manager.email})
																						</span>
																					</div>
																				))
																			) : watchedAssignToDepartment ? (
																				<p className="text-sm text-slate-500 p-2">
																					No managers in this department
																				</p>
																			) : (
																				<p className="text-sm text-slate-500 p-2">
																					Select a department to load managers
																				</p>
																			)}
																		</div>
																		{selectedManagers.length > 0 && (
																			<div className="text-xs text-slate-600">
																				Selected: {selectedManagers.length}{" "}
																				manager(s)
																			</div>
																		)}
																	</div>
																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name="internalApproverIds"
															render={({ field }) => (
																<FormItem>
																	<FormLabel className="shad-form-label">
																		Internal Approvers
																	</FormLabel>
																	<div className="space-y-2">
																		<div className="max-h-40 overflow-y-auto border border-slate-300 rounded-md bg-white p-2">
																			{availableManagers.length > 0 ? (
																				availableManagers.map((manager) => (
																					<div
																						key={manager.$id}
																						className="flex items-center space-x-2 p-2 hover:bg-white/20 rounded cursor-pointer"
																						onClick={() => {
																							const newSelection =
																								selectedApprovers.includes(
																									manager.$id,
																								)
																									? selectedApprovers.filter(
																											(id) =>
																												id !== manager.$id,
																										)
																									: [
																											...selectedApprovers,
																											manager.$id,
																										];
																							setSelectedApprovers(
																								newSelection,
																							);
																							field.onChange(newSelection);
																						}}
																					>
																						<input
																							type="checkbox"
																							checked={selectedApprovers.includes(
																								manager.$id,
																							)}
																							onChange={() => {
																								const newSelection =
																									selectedApprovers.includes(
																										manager.$id,
																									)
																										? selectedApprovers.filter(
																												(id) =>
																													id !== manager.$id,
																											)
																										: [
																												...selectedApprovers,
																												manager.$id,
																											];
																								setSelectedApprovers(
																									newSelection,
																								);
																								field.onChange(newSelection);
																							}}
																							className="cursor-pointer"
																						/>
																						<span className="text-sm text-slate-700">
																							{manager.fullName} (
																							{manager.email})
																						</span>
																					</div>
																				))
																			) : (
																				<p className="text-sm text-slate-500 p-2">
																					Managers will load once available
																				</p>
																			)}
																		</div>
																		{selectedApprovers.length > 0 && (
																			<div className="text-xs text-slate-600">
																				Selected: {selectedApprovers.length}{" "}
																				approver(s)
																			</div>
																		)}
																	</div>
																	<FormMessage />
																</FormItem>
															)}
														/>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="approvalWorkflowTemplate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Approval Workflow Template
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Standard, expedited, executive..."
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="currentApprovalStage"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Current Approval Stage
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., Legal review"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="approvalDueDate"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Approval Due Date
																		</FormLabel>
																		<FormControl>
																			<DatePicker
																				selected={field.value}
																				onChange={(date: Date | null) =>
																					field.onChange(date)
																				}
																				dateFormat="MM/dd/yyyy"
																				className="w-full px-3 py-2 bg-white border-slate-300 rounded-md"
																				placeholderText="Select due date"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<FormField
															control={form.control}
															name="reviewerComments"
															render={({ field }) => (
																<FormItem>
																	<FormLabel className="shad-form-label">
																		Reviewer Comments
																	</FormLabel>
																	<FormControl>
																		<Textarea
																			rows={2}
																			placeholder="Notes from legal, compliance or leadership"
																			{...field}
																			className="bg-white border-slate-300 resize-none"
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="approvalEscalationContactIds"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Escalation Contacts
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="IDs or emails separated by comma/newline"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="workflowNotes"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Workflow Notes
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Routing instructions, hold reasons, etc."
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 7: Notifications & Renewal Alerts */}
												{currentStep === 7 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="alertRecipientIds"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Alert Recipients
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Enter IDs or emails separated by comma/newline"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="alertEscalationContactIds"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Escalation Contacts
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Escalate to these contacts"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="alertLeadTimes"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Alert Lead Times (days)
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., 30,60, or 90"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="alertChannels"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Alert Channels
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="email,sms,teams"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="alertStrategy"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Alert Strategy
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Standard, executive, custom..."
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-2 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="alertNotes"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="shad-form-label">
																			Alert Notes
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Include context for who needs to know what and when"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="alertRecipientIds"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Alert Recipients
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="List recipient IDs or emails"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 8: Documents, Attachments & Metadata */}
												{currentStep === 8 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="versionNumber"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Version
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="v1.0"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="templateUsed"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Template Used
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Enterprise-MSA-v3"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="parentContractId"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Parent Contract ID
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="If this is an amendment"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="relatedDocumentIds"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Related Document IDs
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="List attachment or exhibit IDs"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="attachmentReferences"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Attachment References
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Exhibit A, Attachment B..."
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-1 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="businessPurpose"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="shad-form-label">
																			Business Purpose
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Explain why this contract exists and the value delivered"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="tags"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Tags / Keywords
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="compliance,behavioral-health"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
															<FormField
																control={form.control}
																name="searchKeywords"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Search Keywords
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="Add metadata to improve discovery"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 9: Legal & Governance */}
												{currentStep === 9 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="governingLaw"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Governing Law
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="State or country of jurisdiction"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="jurisdiction"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Venue / Jurisdiction
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., Miami-Dade County, FL"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="disputeResolutionMethod"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Dispute Resolution
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select method" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{DISPUTE_METHOD_OPTIONS.map(
																					(method) => (
																						<SelectItem
																							key={method}
																							value={method}
																						>
																							{method.replace("_", " ")}
																						</SelectItem>
																					),
																				)}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="confidentialityClassification"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Confidentiality Classification
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Select level" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{CONFIDENTIALITY_CLASSES.map(
																					(level) => (
																						<SelectItem
																							key={level}
																							value={level}
																						>
																							{level}
																						</SelectItem>
																					),
																				)}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="recordsRetentionPeriodMonths"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Records Retention (Months)
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="e.g., 84"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}

												{/* Step 10: Digital Signatures & Access Controls */}
												{currentStep === 10 && (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="digitalSignatureRequired"
																render={({ field }) => (
																	<FormItem className="space-y-2">
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Digital Signature Required
																		</FormLabel>
																		<FormControl>
																			<Switch
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="digitalSignatureStatus"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Signature Status
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Status" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{SIGNATURE_STATUS_OPTIONS.map(
																					(status) => (
																						<SelectItem
																							key={status}
																							value={status}
																						>
																							{status.replace("_", " ")}
																						</SelectItem>
																					),
																				)}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="digitalSignaturePlatform"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Signature Platform
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="DocuSign, Adobe Sign, etc."
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="digitalSignatureCompletedAt"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Signature Completed At
																		</FormLabel>
																		<FormControl>
																			<DatePicker
																				selected={field.value}
																				onChange={(date: Date | null) =>
																					field.onChange(date)
																				}
																				dateFormat="MM/dd/yyyy"
																				className="w-full px-3 py-2 bg-white border-slate-300 rounded-md"
																				placeholderText="Completion date"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="digitalSignatureEnvelopeId"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Envelope / Packet ID
																		</FormLabel>
																		<FormControl>
																			<Input
																				placeholder="DocuSign envelope ID"
																				{...field}
																				className="bg-white border-slate-300"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="accessScope"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Access Scope
																		</FormLabel>
																		<Select
																			onValueChange={field.onChange}
																			defaultValue={field.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white border-slate-300">
																					<SelectValue placeholder="Who can view this?" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent>
																				{ACCESS_SCOPE_OPTIONS.map((scope) => (
																					<SelectItem key={scope} value={scope}>
																						{scope}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>

														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
															<FormField
																control={form.control}
																name="signatureRecipientIds"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Signature Recipients
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="List recipients or email addresses"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>

															<FormField
																control={form.control}
																name="visibilityRoles"
																render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-sm text-slate-700 mb-1 block">
																			Visibility Roles
																		</FormLabel>
																		<FormControl>
																			<Textarea
																				rows={2}
																				placeholder="Comma separated role keys"
																				{...field}
																				className="bg-white border-slate-300 resize-none"
																			/>
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)}
															/>
														</div>
													</div>
												)}
											</div>
										</div>
									)}
									{/* Save and Resume Later */}
									{processedFileData && (
										<SaveProgressCard
											onSave={handleManualSave}
											isSaving={isSaving}
										/>
									)}
									{/* Upload Progress */}
									{isUploading && (
										<Card className="border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50">
											<CardContent className="pt-6">
												<div className="space-y-2">
													<div className="flex justify-between text-sm">
														<span className="text-navy">
															Uploading contract...
														</span>
														<span className="text-brand font-medium">
															{uploadProgress}%
														</span>
													</div>
													<div className="w-full bg-light-300 rounded-full h-2">
														<div
															className="bg-linear-to-r from-brand to-brand-100 h-2 rounded-full transition-all duration-300"
															style={{ width: `${uploadProgress}%` }}
														/>
													</div>
												</div>
											</CardContent>
										</Card>
									)}
								</form>
							</Form>
						</div>

						{/* Sticky Footer with Navigation and Action Buttons */}
						<div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 px-6 py-4">
							<div className="flex items-center justify-between">
								{/* Previous/Back Button */}
								<div className="flex items-center space-x-3">
									{currentStep === 1 && selectedContractType ? (
										<Button
											type="button"
											onClick={() => {
												setSelectedContractType(null);
												setShowTypeSelection(true);
												setProcessedFileData(null);
												setExtractedData(null);
											}}
											variant="outline"
											disabled={isUploading}
											className="primary-btn px-3 sm:px-4 shimmer-hover"
										>
											<ChevronLeft className="w-4 h-4" />
											Change Type
										</Button>
									) : currentStep > 1 ? (
										<Button
											type="button"
											variant="outline"
											onClick={prevStep}
											disabled={isUploading}
											className="primary-btn sm:px-4 px-3 shimmer-hover"
										>
											<ChevronLeft className="w-4 h-4" />
											Previous
										</Button>
									) : null}
									<Button
										type="button"
										variant="outline"
										onClick={handleCancelClick}
										disabled={isUploading}
										className="primary-btn px-3 sm:px-4 shimmer-hover"
									>
										<Ban className="w-4 h-4" />
										Cancel
									</Button>
								</div>

								{/* Next/Submit Button */}
								<div className="flex items-center space-x-3">
									{currentStep < totalSteps ? (
										<Button
											type="button"
											onClick={nextStep}
											disabled={
												isUploading || (currentStep === 1 && !processedFileData)
											}
											className="primary-btn sm:px-4 px-3"
										>
											Next
											<ChevronRight className="w-4 h-4" />
										</Button>
									) : (
										<Button
											type="button"
											onClick={async () => {
												console.log("Upload button clicked");
												const values = form.getValues();
												console.log("Form values:", values);
												const errors = await form.trigger();
												console.log("Validation result:", errors);
												console.log("Form errors:", form.formState.errors);

												if (errors) {
													await handleSubmit(values);
												} else {
													toast({
														title: "Validation Error",
														description: "Please fill in all required fields",
														variant: "destructive",
													});
												}
											}}
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
													<Upload className="h-4 w-4 mr-2" />
													Upload Contract
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

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent className="sm:max-w-md p-0 overflow-hidden border border-slate-200 shadow-xl">
					<AlertDialogTitle className="sr-only">Delete Draft</AlertDialogTitle>
					{/* Cap */}
					<div className="h-4 w-full bg-[#d6d7d8] opacity-70" />

					{/* Header */}
					<div className="px-6 py-4 bg-white border-b border-slate-200">
						<div className="flex gap-2">
							<AlertTriangle className="w-5 h-5 text-[#f7d333]" />
							<h2 className="text-base font-semibold sidebar-gradient-text">
								Delete Draft
							</h2>
						</div>
						<div>
							<AlertDialogDescription className="text-sm text-slate-600 mt-1 ml-7">
								Are you sure you want to delete this draft? This action cannot
								be undone.
							</AlertDialogDescription>
						</div>
					</div>

					{/* Body */}
					<div className="px-6 py-5 space-y-3 bg-white">
						<p className="text-sm text-slate-600">
							Your decision to delete is irreversible, so please make sure you
							want to continue.
						</p>
					</div>

					{/* Footer */}
					<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
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
								onClick={() => {
									if (draftToDelete) {
										deleteDraft(draftToDelete);
										setDraftToDelete(null);
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

			{/* Cancel Confirmation Dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent className="max-w-[500px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Header with gradient background */}
					<div className="sticky top-0 z-10 bg-gradient-to-r from-orange-50 to-amber-50 py-4 border-b border-slate-200">
						<div className="flex items-center gap-3 px-6">
							{/* Title */}
							<div>
								<AlertDialogTitle className="flex items-center gap-2 text-xl font-semibold sidebar-gradient-text py-2">
									{/* Icon with circular background */}
									<Ban className="w-5 h-5 text-[#0f5384]" />
									Cancel Form?
								</AlertDialogTitle>
								<AlertDialogDescription className="text-sm ml-7 text-slate-600">
									Your progress will not be saved
								</AlertDialogDescription>
							</div>
						</div>
					</div>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto py-2 px-6 bg-white">
						<p className="text-sm text-slate-700 leading-relaxed">
							Are you sure you want to cancel? If you cancel, the form will not
							be saved and all progress will be lost. You can save your progress
							using the "Save Progress" button before canceling.
						</p>
					</div>

					{/* Professional Footer */}
					<div className="py-4 bg-slate-50 border-t border-slate-200 flex justify-center items-center gap-3">
						<AlertDialogCancel
							onClick={() => setCancelDialogOpen(false)}
							className="primary-btn px-4 sm:px-4 shimmer-hover"
						>
							<StepForward className="h-4 w-4" />
							Continue Editing
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelConfirm}
							className="primary-btn px-4 sm:px-4 shimmer-hover"
						>
							<Ban className="h-4 w-4" />
							Cancel & Discard
						</AlertDialogAction>
					</div>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
};

export default ContractUploadForm;
