"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	ArrowRight,
	Ban,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CircleHelp,
	FileCheck,
	FileText,
	FolderOpen,
	Info,
	Loader2,
	StepForward,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import DatePicker from "react-datepicker";
import { useDropzone } from "react-dropzone";
import {
	DEMO_CONTRACT_SAMPLE,
	DemoSampleDocumentDrop,
} from "@/components/demo/DemoSampleDocumentDrop";
import {
	handleDemoSampleDragOverCapture,
	handleDemoSampleDropCapture,
} from "@/components/demo/demoSampleDrag";
import { SaveProgressCard } from "@/components/SaveProgressCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CaalmDatePicker,
	parseIsoDateLocal,
	toIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyAmountInput } from "@/components/ui/currency-amount-input";
import { CurrencySelect } from "@/components/ui/currency-select";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn, constructFileUrl } from "@/lib/utils";
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
	AiExtractionReviewPanel,
	AiExtractionStatusBadge,
} from "@/components/contract-upload/AiExtractionReview";
import ContractReviewStep from "@/components/contract-upload/ContractReviewStep";
import {
	CaalmFilledProvider,
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
	buildFormPatchFromExtraction,
	isRealExtractionMethod,
	LOW_EXTRACTION_CONFIDENCE,
	parseContractExtractionJson,
} from "@/lib/ai/contractExtractionSchema";
import {
	buildContractTypeFallbackResult,
	type ContractTypeSuggestionResult,
} from "@/lib/ai/contractTypeSuggestionSchema";
import { scrubTemplateTokenValue } from "@/lib/ai/scrubTemplateTokens";
import {
	type AssigneeSource,
	assigneeFallbackMessage,
	pickAssigneeIds,
} from "@/lib/assignments/resolve-default-assignee";
import {
	AI_EXTRACTION_LIMIT_TITLE,
	isAiExtractionLimitError,
	throwIfAiExtractionHttpFailed,
} from "@/lib/billing/aiExtractionUserMessages";
import { isDemoMode } from "@/lib/config/demo-mode";
import {
	CONTRACT_TYPE_CONFIGS,
	getContractTypeConfig,
	getFieldsForStep,
	getRequiredFields,
	resolveDraftContractTypeId,
} from "@/lib/contracts/contractTypeConfigs";
import {
	generateDocumentNumber,
	needsDocumentNumber,
} from "@/lib/contracts/documentNumber";
import { currencySymbol } from "@/lib/currency";
import {
	getEnterpriseDropzoneAccept,
	getEnterpriseFormatHint,
} from "@/lib/files/enterprise-file-formats";
import { getNoticeThresholds } from "@/lib/renewals/expiryNotice";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import { fireConfetti } from "@/lib/ui/confetti";
import { useCtaButtonClass } from "@/lib/ui/use-cta-button-class";
import {
	CONTRACT_DEPARTMENTS,
	DIVISION_TO_DEPARTMENT,
	formatDivisionName,
	USER_DIVISIONS,
	type UserDivision,
} from "../../constants";

/** Demo mode: only these contract type cards are selectable (plus Drafts). */
const DEMO_ALLOWED_CONTRACT_TYPE_IDS = new Set(["grant", "government"]);

function isDemoContractTypeAllowed(typeId: string): boolean {
	if (!isDemoMode()) return true;
	return DEMO_ALLOWED_CONTRACT_TYPE_IDS.has(typeId);
}

const LocalPdfPreviewDialog = dynamic(
	() => import("@/components/contract-upload/LocalPdfPreviewDialog"),
	{ ssr: false },
);

function formatAlertLeadTimesLabel(renewalNoticeDays?: string): string {
	const thresholds = getNoticeThresholds(renewalNoticeDays || "30");
	return `${thresholds.join(", ")} days`;
}

function alertLeadTimesFromRenewalNotice(renewalNoticeDays?: string): string {
	return getNoticeThresholds(renewalNoticeDays || "30").join(",");
}

interface ContractUploadFormProps {
	ownerId: string;
	accountId: string;
	className?: string;
	triggerLabel?: string;
	onSuccess?: () => void;
}

// Processed file data interface
interface ProcessedFileData {
	name: string;
	type: string;
	size: number;
	base64Content?: string;
	arrayBuffer?: ArrayBuffer | number[];
	lastModified: number;
	bucketFileId?: string | null;
}

function toArrayBuffer(
	data: ArrayBuffer | number[] | Uint8Array | undefined | null,
): ArrayBuffer | null {
	if (!data) return null;
	if (data instanceof ArrayBuffer) {
		return data.byteLength > 0 ? data : null;
	}
	if (data instanceof Uint8Array) {
		if (data.byteLength === 0) return null;
		const copy = new Uint8Array(data.byteLength);
		copy.set(data);
		return copy.buffer;
	}
	if (Array.isArray(data) && data.length > 0) {
		return new Uint8Array(data).buffer;
	}
	return null;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer | null {
	try {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	} catch {
		return null;
	}
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
	"Government Grant",
	"Government Contract",
	"Grant Agreement",
	"Amendment",
	"Other",
];

type AiQuizQuestionDef = {
	id: string;
	text: string;
	kind?: "choices" | "freeText";
	options: { value: string; label: string }[];
	showWhen?: (answers: Record<string, string>) => boolean;
};

/** Purpose-first flow with conditional follow-ups (client-side branching). */
const AI_QUIZ_QUESTION_DEFS: AiQuizQuestionDef[] = [
	{
		id: "purpose",
		text: "What best describes the primary purpose?",
		kind: "choices",
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
		id: "purpose_detail_employment",
		text: "Is this for a W-2 employee or an independent contractor?",
		kind: "choices",
		showWhen: (a) => a.purpose === "Employment",
		options: [
			{ value: "W-2", label: "W-2 employee" },
			{ value: "1099", label: "Independent contractor" },
		],
	},
	{
		id: "purpose_detail_property",
		text: "Is this primarily a lease or a purchase / sale?",
		kind: "choices",
		showWhen: (a) => a.purpose === "Property",
		options: [
			{
				value: "Lease",
				label: "Lease / rental of space or property",
			},
			{
				value: "Purchase",
				label: "Purchase, sale, or other property transaction",
			},
		],
	},
	{
		id: "purpose_detail_services",
		text: "What kind of services relationship is this?",
		kind: "choices",
		showWhen: (a) => a.purpose === "Services",
		options: [
			{
				value: "Consulting",
				label: "Professional / consulting services",
			},
			{
				value: "Vendor",
				label: "Vendor, supplies, or general services",
			},
		],
	},
	{
		id: "party_type",
		text: "Is this contract between a business and individual, or business to business?",
		kind: "choices",
		options: [
			{ value: "B2B", label: "Business to business" },
			{ value: "B2C", label: "Business to individual" },
			{ value: "Both", label: "Both / Mixed" },
		],
	},
	{
		id: "duration",
		text: "Does this involve ongoing services or a one-time transaction?",
		kind: "choices",
		options: [
			{ value: "Ongoing", label: "Ongoing services" },
			{ value: "One-time", label: "One-time transaction" },
			{ value: "Mixed", label: "Mixed" },
		],
	},
	{
		id: "compliance",
		text: "Does this require government or regulatory compliance?",
		kind: "choices",
		options: [
			{ value: "Yes", label: "Yes" },
			{ value: "No", label: "No" },
			{ value: "Unsure", label: "Unsure" },
		],
	},
	{
		id: "free_text",
		text: "In one sentence, what is this contract for? (optional)",
		kind: "freeText",
		options: [],
	},
];

function getVisibleAiQuizQuestions(
	answers: Record<string, string>,
): AiQuizQuestionDef[] {
	return AI_QUIZ_QUESTION_DEFS.filter(
		(q) => !q.showWhen || q.showWhen(answers),
	);
}

function pruneAiQuizAnswersToVisible(
	answers: Record<string, string>,
	visible: AiQuizQuestionDef[],
): Record<string, string> {
	const ids = new Set(visible.map((q) => q.id));
	const next: Record<string, string> = {};
	for (const id of ids) {
		const v = answers[id];
		if (v !== undefined && v !== "") next[id] = v;
	}
	return next;
}

/** CAALM AI Assistant quiz: option row, arrow chip, ghost button, gradient pill. */
const AI_QUIZ_OPTION_CLASS =
	"group flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] border-slate-200 bg-white/85 px-3.5 py-[11px] text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_10px_rgba(7,143,171,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]";
const AI_QUIZ_ARROW_CHIP_CLASS =
	"flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#078fab]/[.08] text-[#078fab] transition-[transform,background-color] duration-150 group-hover:translate-x-0.5 group-hover:bg-[#078fab]/[.16]";
const AI_QUIZ_GHOST_BTN_CLASS =
	"inline-flex h-[34px] cursor-pointer items-center rounded-full px-3 text-[12.5px] font-semibold text-slate-400 transition-colors duration-200 hover:bg-black/[.04] hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]";
/** Drafts dialog: outlined destructive pill (never ghost, never the gradient). */
const DRAFT_DELETE_BTN_CLASS =
	"inline-flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-[#dc2626]/[.22] bg-[#dc2626]/[.06] px-3 text-xs font-semibold text-[#dc2626] transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#dc2626]/35 hover:bg-[#dc2626]/[.12] hover:shadow-[0_2px_8px_rgba(220,38,38,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626]";
/** Back button that sits at the top of a dialog, on the same row as the close X. */
const DIALOG_BACK_LINK_CLASS =
	"inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab] disabled:cursor-not-allowed disabled:opacity-50";
const AI_QUIZ_CTA_CLASS =
	"inline-flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[linear-gradient(90deg,#00c1cb,#078fab,#0e638f)] px-4 text-[12.5px] font-semibold text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab] disabled:pointer-events-none disabled:opacity-50";

const AI_ASSISTANT_OPEN_CHIP_CLASS =
	"inline-flex h-10 items-center gap-2 rounded-full border border-white/45 bg-white/38 px-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all hover:border-[#0f5384]/35 hover:bg-white/50";

/** Select Contract Type screen: section label and icon tile shared by its cards. */
const TYPE_SELECT_LABEL =
	"mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400";
const TYPE_SELECT_ICON_TILE =
	"flex shrink-0 items-center justify-center rounded-[9px] border border-[#0f5384]/[.12] bg-[#0f5384]/[.07]";

/**
 * Minimum time (ms) the AI quiz loading `.mp4` is shown before switching to results.
 * - Edit the fallback number below, or
 * - Set `NEXT_PUBLIC_AI_QUIZ_LOADING_MIN_MS` in `.env` (0 = show results as soon as the API returns).
 */
const AI_QUIZ_LOADING_MIN_MS = (() => {
	const raw = process.env.NEXT_PUBLIC_AI_QUIZ_LOADING_MIN_MS;
	if (raw !== undefined && raw !== "") {
		const n = Number(raw);
		if (Number.isFinite(n) && n >= 0) return n;
	}
	return 5000;
})();

const RISK_LEVELS = [
	{ value: "critical", label: "Critical" },
	{ value: "high", label: "High" },
	{ value: "medium", label: "Medium" },
	{ value: "low", label: "Low" },
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

const NOTICE_DAY_OPTIONS = ["15", "30", "45", "60", "90", "120", "180"];

const CURE_PERIOD_OPTIONS = ["5", "10", "15", "30", "45", "60"];

const TERMINATION_RIGHTS_OPTIONS = [
	{ value: "for_cause", label: "For cause" },
	{ value: "for_convenience", label: "For convenience" },
	{ value: "both", label: "For cause and convenience" },
	{ value: "mutual", label: "Mutual agreement only" },
	{ value: "other", label: "Other" },
];

const GOVERNING_LAW_OPTIONS = [
	"State of Florida",
	"Florida",
	"United States",
	"Delaware",
	"New York",
	"California",
	"Texas",
	"Other",
];

const JURISDICTION_OPTIONS = [
	"Miami-Dade County, FL",
	"Broward County, FL",
	"Palm Beach County, FL",
	"Hillsborough County, FL",
	"Orange County, FL",
	"Duval County, FL",
	"State of Florida courts",
	"Federal courts in Florida",
	"Other",
];

const ALERT_CHANNEL_OPTIONS = [
	{ value: "email", label: "Email" },
	{ value: "email,sms", label: "Email + SMS" },
	{ value: "email,in_app", label: "Email + In-app" },
	{ value: "email,sms,in_app", label: "Email + SMS + In-app" },
];

const ALERT_STRATEGY_OPTIONS = [
	{ value: "standard", label: "Standard" },
	{ value: "executive", label: "Executive" },
	{ value: "aggressive", label: "Aggressive" },
	{ value: "custom", label: "Custom" },
];

function divisionsForDepartment(department: string): UserDivision[] {
	return USER_DIVISIONS.filter(
		(div) => DIVISION_TO_DEPARTMENT[div] === department,
	);
}

function normalizeLocalDate(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function WizardDateButton({
	value,
	onChange,
	placeholder,
	disablePast = false,
}: {
	value?: Date;
	onChange: (date: Date | undefined) => void;
	placeholder: string;
	disablePast?: boolean;
}) {
	return (
		<CaalmDatePicker
			value={value ? toIsoDateLocal(value) : ""}
			placeholder={placeholder}
			disablePast={disablePast}
			onChange={(iso) => {
				const next = iso ? parseIsoDateLocal(iso) : undefined;
				onChange(next ? normalizeLocalDate(next) : undefined);
			}}
		/>
	);
}

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

const RETENTION_MONTH_OPTIONS = [
	{ value: "12", label: "12 months (1 year)" },
	{ value: "24", label: "24 months (2 years)" },
	{ value: "36", label: "36 months (3 years)" },
	{ value: "60", label: "60 months (5 years)" },
	{ value: "84", label: "84 months (7 years)" },
	{ value: "120", label: "120 months (10 years)" },
];

const contractSchema = z
	.object({
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
		subDepartment: z.string().min(1, "Division is required"),
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
		assignedManagers: z.array(z.string()).min(1, "Assigned To is required"),
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
	})
	.superRefine((data, ctx) => {
		if (!data.notToExceedAmount?.trim()) return;
		const amount = parseFloat(data.amount.replace(/[$,]/g, ""));
		const nte = parseFloat(data.notToExceedAmount.replace(/[$,]/g, ""));
		if (Number.isNaN(nte)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["notToExceedAmount"],
				message: "Enter a valid not-to-exceed amount",
			});
			return;
		}
		if (!Number.isNaN(amount) && nte < amount) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["notToExceedAmount"],
				message: "Not-to-exceed amount cannot be less than the contract amount",
			});
		}
	});

const ContractUploadForm: React.FC<ContractUploadFormProps> = ({
	ownerId,
	accountId,
	className,
	triggerLabel = "Upload Contract",
	onSuccess,
}) => {
	const cta = useCtaButtonClass();
	const path = usePathname();
	const router = useRouter();
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [processedFileData, setProcessedFileData] =
		useState<ProcessedFileData | null>(null);
	/** Survives draft JSON round-trips that drop ArrayBuffer / base64 */
	const fileBytesRef = useRef<ArrayBuffer | null>(null);
	const [extractedData, setExtractedData] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [extractionMethod, setExtractionMethod] = useState<string | null>(null);
	const [overallExtractionConfidence, setOverallExtractionConfidence] =
		useState<number | null>(null);
	const [aiFilledFields, setAiFilledFields] = useState<string[]>([]);
	const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);
	const [fieldConfidence, setFieldConfidence] = useState<
		Record<string, number>
	>({});
	const [isExtracting, setIsExtracting] = useState(false);
	/** Step 1 file ingest: progress bar → brief check → hide */
	const [fileIngestUi, setFileIngestUi] = useState<
		"hidden" | "progress" | "success"
	>("hidden");
	const [fileIngestProgress, setFileIngestProgress] = useState(0);
	const fileIngestSuccessTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const [availableManagers, setAvailableManagers] = useState<
		Array<{ $id: string; fullName: string; email: string; division?: string }>
	>([]);
	const [filteredManagers, setFilteredManagers] = useState<
		Array<{ $id: string; fullName: string; email: string; division?: string }>
	>([]);
	const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
	const [assigneeSource, setAssigneeSource] =
		useState<AssigneeSource>("selected");
	const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
	const [currentStep, setCurrentStep] = useState(1);
	const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
	const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
	const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
	const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
	const [previewHtml, setPreviewHtml] = useState<string | null>(null);
	const [previewText, setPreviewText] = useState<string | null>(null);
	const [previewDownloadOnly, setPreviewDownloadOnly] = useState(false);
	const stepScrollRef = useRef<HTMLDivElement | null>(null);
	const isResumingDraftRef = React.useRef(false);

	// Contract type selection state
	const [selectedContractType, setSelectedContractType] = useState<
		string | null
	>(null);
	const [showTypeSelection, setShowTypeSelection] = useState(true);
	const [showDraftsList, setShowDraftsList] = useState(false);

	// AI quiz state
	const [showAiQuiz, setShowAiQuiz] = useState(false);
	const [aiQuizStep, setAiQuizStep] = useState(0);
	const [aiQuizAnswers, setAiQuizAnswers] = useState<Record<string, string>>(
		{},
	);
	const [aiSuggestion, setAiSuggestion] =
		useState<ContractTypeSuggestionResult | null>(null);
	const [aiQuizFreeTextDraft, setAiQuizFreeTextDraft] = useState("");
	const [aiQuizPhase, setAiQuizPhase] = useState<
		"questions" | "loading" | "result"
	>("questions");
	const [aiQuizDirection, setAiQuizDirection] = useState<"forward" | "back">(
		"forward",
	);

	const visibleAiQuizQuestions = useMemo(
		() => getVisibleAiQuizQuestions(aiQuizAnswers),
		[aiQuizAnswers],
	);

	useEffect(() => {
		const q = visibleAiQuizQuestions[aiQuizStep];
		if (q?.id === "free_text") {
			setAiQuizFreeTextDraft(aiQuizAnswers.free_text ?? "");
		}
	}, [aiQuizStep, visibleAiQuizQuestions, aiQuizAnswers]);

	useEffect(() => {
		if (
			visibleAiQuizQuestions.length > 0 &&
			aiQuizStep >= visibleAiQuizQuestions.length
		) {
			setAiQuizStep(visibleAiQuizQuestions.length - 1);
		}
	}, [visibleAiQuizQuestions.length, aiQuizStep]);

	const submitAiQuizSuggestion = useCallback(
		async (pruned: Record<string, string>) => {
			const loadingStartedAt =
				typeof performance !== "undefined" ? performance.now() : Date.now();
			setAiQuizPhase("loading");
			try {
				const freeText = pruned.free_text?.trim();
				const answersForApi = Object.entries(pruned)
					.filter(([questionId]) => questionId !== "free_text")
					.map(([questionId, answer]) => ({ questionId, answer }));

				const res = await fetch("/api/ai-contract-type-suggest", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						answers: answersForApi,
						...(freeText ? { freeText } : {}),
					}),
				});

				const data = (await res.json().catch(() => null)) as
					| ContractTypeSuggestionResult
					| { error?: string; details?: string }
					| null;

				if (!res.ok) {
					toast({
						title: "Couldn't get AI suggestion",
						description:
							data &&
							typeof data === "object" &&
							"error" in data &&
							typeof data.error === "string"
								? data.error
								: "Choose a type from the full list.",
						variant: "destructive",
					});
					setAiSuggestion(
						buildContractTypeFallbackResult(
							data &&
								typeof data === "object" &&
								"details" in data &&
								typeof data.details === "string"
								? data.details
								: "Choose a contract type manually below.",
						),
					);
				} else if (
					data &&
					typeof data === "object" &&
					"primaryTypeId" in data
				) {
					setAiSuggestion(data as ContractTypeSuggestionResult);
				} else {
					setAiSuggestion(
						buildContractTypeFallbackResult(
							"Invalid response from AI. Browse all contract types below.",
						),
					);
				}
			} catch {
				toast({
					title: "Couldn't get AI suggestion",
					description:
						"Check your connection and try again, or browse all types.",
					variant: "destructive",
				});
				setAiSuggestion(
					buildContractTypeFallbackResult(
						"Network error. Browse all contract types below.",
					),
				);
			}

			const elapsedMs =
				typeof performance !== "undefined"
					? performance.now() - loadingStartedAt
					: Date.now() - loadingStartedAt;
			const remainingMs = Math.max(0, AI_QUIZ_LOADING_MIN_MS - elapsedMs);
			if (remainingMs > 0) {
				await new Promise((resolve) => setTimeout(resolve, remainingMs));
			}
			setAiQuizPhase("result");
		},
		[toast],
	);

	const handleAiQuizChoice = useCallback(
		(optValue: string) => {
			const q = visibleAiQuizQuestions[aiQuizStep];
			if (!q || q.kind === "freeText") return;

			const merged = { ...aiQuizAnswers, [q.id]: optValue };
			const visible = getVisibleAiQuizQuestions(merged);
			const pruned = pruneAiQuizAnswersToVisible(merged, visible);
			setAiQuizAnswers(pruned);

			const nextStep = aiQuizStep + 1;
			if (nextStep < visible.length) {
				setAiQuizDirection("forward");
				setAiQuizStep(nextStep);
			} else {
				void submitAiQuizSuggestion(pruned);
			}
		},
		[aiQuizAnswers, aiQuizStep, visibleAiQuizQuestions, submitAiQuizSuggestion],
	);

	const handleAiQuizFreeTextContinue = useCallback(
		(skip: boolean) => {
			const q = visibleAiQuizQuestions[aiQuizStep];
			if (!q || q.id !== "free_text") return;

			const merged: Record<string, string> = { ...aiQuizAnswers };
			if (skip || !aiQuizFreeTextDraft.trim()) {
				delete merged.free_text;
			} else {
				merged.free_text = aiQuizFreeTextDraft.trim();
			}

			const visible = getVisibleAiQuizQuestions(merged);
			const pruned = pruneAiQuizAnswersToVisible(merged, visible);
			setAiQuizAnswers(pruned);
			void submitAiQuizSuggestion(pruned);
		},
		[
			aiQuizAnswers,
			aiQuizFreeTextDraft,
			aiQuizStep,
			visibleAiQuizQuestions,
			submitAiQuizSuggestion,
		],
	);

	/** Forget the chosen file and everything extracted from it. */
	const clearUploadedFile = () => {
		fileBytesRef.current = null;
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
	};

	/** Step 1 back button: return to the contract type grid. */
	const handleChangeType = () => {
		setSelectedContractType(null);
		setShowTypeSelection(true);
		clearUploadedFile();
	};

	const resetAiQuiz = () => {
		setAiQuizStep(0);
		setAiQuizAnswers({});
		setAiSuggestion(null);
		setAiQuizFreeTextDraft("");
		setAiQuizPhase("questions");
		setAiQuizDirection("forward");
	};

	/** Leave the assistant and return to the contract type grid. */
	const closeAiQuiz = () => {
		setShowAiQuiz(false);
		resetAiQuiz();
	};

	/** One step back; from the first question, back to the type grid. */
	const handleAiQuizBack = () => {
		if (aiQuizPhase === "result") {
			setAiQuizDirection("back");
			setAiQuizStep(Math.max(0, visibleAiQuizQuestions.length - 1));
			setAiQuizPhase("questions");
			return;
		}
		if (aiQuizStep > 0) {
			setAiQuizDirection("back");
			setAiQuizStep((step) => step - 1);
			return;
		}
		closeAiQuiz();
	};

	/** Jump to an earlier question from the step toggle; answers are kept. */
	const handleAiQuizTab = (value: string) => {
		const index = Number(value.slice(1));
		if (value === "results" || !Number.isInteger(index)) return;
		if (index >= visibleAiQuizQuestions.length) return;
		setAiQuizDirection(index < aiQuizStep ? "back" : "forward");
		setAiQuizStep(index);
		setAiQuizPhase("questions");
	};

	// Get current contract type configuration
	const currentTypeConfig = selectedContractType
		? getContractTypeConfig(selectedContractType)
		: null;

	// Define form steps dynamically based on selected contract type (+ Review before upload)
	const contentSteps = currentTypeConfig?.steps || 10;
	const contentStepTitles = currentTypeConfig?.stepTitles || [
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
	const totalSteps = contentSteps + 1;
	const stepTitles = [...contentStepTitles, "Review"];
	const isReviewStep = currentStep === totalSteps;
	// Typed wizards (government, grant, …) have fewer than 10 steps — match by title.
	const isDigitalSignaturesStep =
		!isReviewStep &&
		contentStepTitles[currentStep - 1] === "Digital Signatures";

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
			alertLeadTimes: alertLeadTimesFromRenewalNotice("60"),
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

	// Filter managers when department or division changes; always keep a default assignee.
	const watchedAssignToDepartment = form.watch("assignToDepartment");
	const watchedSubDepartment = form.watch("subDepartment");
	useEffect(() => {
		if (!watchedAssignToDepartment) {
			setFilteredManagers([]);
			return;
		}
		const fetchDepartmentManagers = async () => {
			try {
				const departmentManagers = await getUsersByDepartment(
					watchedAssignToDepartment,
				);
				const typedManagers = (departmentManagers || []).map(
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
				const pick = pickAssigneeIds({
					divisionCandidates: typedManagers,
					departmentCandidates: typedManagers,
					orgCandidates: availableManagers,
					fallbackUser: ownerId ? { $id: ownerId, fullName: "You" } : undefined,
					division: watchedSubDepartment,
				});
				const display =
					typedManagers.length > 0 ? typedManagers : pick.managers;
				setFilteredManagers(
					display.map((manager) => ({
						$id: manager.$id,
						fullName: manager.fullName || "Unknown",
						email: manager.email || "",
						division: manager.division,
					})),
				);
				setAssigneeSource(pick.source);
				setSelectedManagers(pick.ids);
				form.setValue("assignedManagers", pick.ids, {
					shouldValidate: pick.ids.length > 0,
				});

				const currentOwner = form.getValues("departmentOwner");
				const ownerStillValid = display.some(
					(m) => m.$id === currentOwner || m.fullName === currentOwner,
				);
				if (!ownerStillValid) {
					form.setValue(
						"departmentOwner",
						display.length === 1 ? display[0].$id : pick.ids[0] || "",
					);
				}

				const currentSub = form.getValues("subDepartment") as UserDivision;
				const allowed = divisionsForDepartment(watchedAssignToDepartment);
				if (currentSub && !allowed.includes(currentSub)) {
					form.setValue("subDepartment", "");
				}

				if (!form.getValues("businessUnit")) {
					form.setValue("businessUnit", watchedAssignToDepartment);
				}
			} catch (error) {
				console.error("Failed to fetch department managers:", error);
				if (ownerId) {
					setFilteredManagers([{ $id: ownerId, fullName: "You", email: "" }]);
					setSelectedManagers([ownerId]);
					setAssigneeSource("uploader");
					form.setValue("assignedManagers", [ownerId]);
				} else {
					setFilteredManagers([]);
				}
			}
		};
		void fetchDepartmentManagers();
	}, [
		watchedAssignToDepartment,
		watchedSubDepartment,
		availableManagers,
		form,
		ownerId,
	]);

	// Keep alert lead times in sync with Renewal Notice (Days) from Step 2
	const watchedRenewalNoticeDays = form.watch("renewalNoticeDays");
	useEffect(() => {
		form.setValue(
			"alertLeadTimes",
			alertLeadTimesFromRenewalNotice(watchedRenewalNoticeDays),
		);
	}, [watchedRenewalNoticeDays, form]);

	// Synchronous file processing function
	const processFileSynchronously = useCallback(
		(
			file: File,
			onProgress?: (percent: number) => void,
		): Promise<ProcessedFileData> => {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();

				reader.onprogress = (event) => {
					if (event.lengthComputable && event.total > 0) {
						onProgress?.(Math.round((event.loaded / event.total) * 100));
					}
				};

				reader.onload = (event) => {
					try {
						onProgress?.(100);
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
				const typeConfig = selectedContractType
					? getContractTypeConfig(selectedContractType)
					: null;

				const requestBody = {
					fileName: fileData.name,
					fileType: fileData.type,
					fileSize: fileData.size,
					fileContent: fileData.base64Content,
					contractTypeId: selectedContractType,
					contractTypeLabel: typeConfig?.label ?? null,
				};

				const response = await fetch("/api/contracts/extract-data", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				});

				await throwIfAiExtractionHttpFailed(response);

				const result = await response.json();
				if (result.success && result.data) {
					return result.data as Record<string, unknown>;
				}
				return null;
			} catch (error) {
				console.error("Contract data extraction error:", error);
				throw error;
			}
		},
		[selectedContractType],
	);

	// Reset function to clear all form data and file
	const resetForm = useCallback(() => {
		form.reset();
		fileBytesRef.current = null;
		setProcessedFileData(null);
		setExtractedData(null);
		setExtractionMethod(null);
		setOverallExtractionConfidence(null);
		setAiFilledFields([]);
		setLowConfidenceFields([]);
		setFieldConfidence({});
		setIsExtracting(false);
		setFileIngestUi("hidden");
		setFileIngestProgress(0);
		if (fileIngestSuccessTimeoutRef.current) {
			clearTimeout(fileIngestSuccessTimeoutRef.current);
			fileIngestSuccessTimeoutRef.current = null;
		}
		setSelectedManagers([]);
		setSelectedApprovers([]);
		setIsUploading(false);
		setUploadProgress(0);
		setCurrentStep(1);
		setCurrentDraftId(null);
		setSelectedContractType(null);
		setShowTypeSelection(true);
		setShowDraftsList(false);
		setShowAiQuiz(false);
		setAiQuizStep(0);
		setAiQuizAnswers({});
		setAiSuggestion(null);
		setAiQuizFreeTextDraft("");
		setAiQuizPhase("questions");
		setAiQuizDirection("forward");
	}, [form]);

	// Handle contract type selection
	const handleContractTypeSelect = useCallback(
		(typeId: string) => {
			if (!isDemoContractTypeAllowed(typeId)) return;

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
					"subDepartment",
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
		// Assigned To is required. If the department has nobody, keep the fallback.
		if (step === 6) {
			if (selectedManagers.length === 0 && filteredManagers.length > 0) {
				const fallbackId = filteredManagers[0].$id;
				setSelectedManagers([fallbackId]);
				form.setValue("assignedManagers", [fallbackId]);
			} else if (selectedManagers.length === 0 && ownerId) {
				setSelectedManagers([ownerId]);
				form.setValue("assignedManagers", [ownerId]);
			} else if (selectedManagers.length === 0) {
				form.setError("assignedManagers", {
					type: "manual",
					message: "Assigned To is required",
				});
				toast({
					title: "Required Fields Missing",
					description: "Assigned To is required before continuing.",
					variant: "destructive",
				});
				return false;
			}
			form.clearErrors("assignedManagers");
		}

		const requiredFields = getRequiredFieldsForStep(step);
		if (
			requiredFields.includes("amount") &&
			!requiredFields.includes("notToExceedAmount")
		) {
			requiredFields.push("notToExceedAmount");
		}

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
		if (currentStep >= totalSteps) return;
		// Validate content steps before leaving them (skip on Review itself)
		if (currentStep <= contentSteps) {
			const isValid = await validateStep(currentStep);
			if (!isValid) return;
		}
		setCurrentStep((prev) => prev + 1);
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

	const closePdfPreview = useCallback(() => {
		setPdfPreviewOpen(false);
		setPreviewHtml(null);
		setPreviewText(null);
		setPreviewDownloadOnly(false);
		setPdfPreviewUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
	}, []);

	const getLoadedFileBuffer = useCallback((): ArrayBuffer | null => {
		if (!processedFileData) return null;
		return (
			fileBytesRef.current ||
			toArrayBuffer(processedFileData.arrayBuffer) ||
			(processedFileData.base64Content
				? base64ToArrayBuffer(processedFileData.base64Content)
				: null)
		);
	}, [processedFileData]);

	const downloadLoadedFile = useCallback(() => {
		const buffer = getLoadedFileBuffer();
		if (!processedFileData || !buffer) return;
		const url = URL.createObjectURL(
			new Blob([new Uint8Array(buffer)], {
				type: processedFileData.type || "application/octet-stream",
			}),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = processedFileData.name;
		link.click();
		URL.revokeObjectURL(url);
	}, [getLoadedFileBuffer, processedFileData]);

	const openPdfPreview = useCallback(async () => {
		if (!processedFileData) {
			toast({
				title: "Preview unavailable",
				description: "No file is loaded yet.",
				variant: "destructive",
			});
			return;
		}

		const fileName = processedFileData.name.toLowerCase();
		const isPdf =
			processedFileData.type === "application/pdf" || fileName.endsWith(".pdf");
		const isDocx =
			fileName.endsWith(".docx") ||
			processedFileData.type.includes(
				"application/vnd.openxmlformats-officedocument.wordprocessingml",
			);
		const isTxt =
			fileName.endsWith(".txt") || processedFileData.type.startsWith("text/");
		const isLegacyDoc =
			fileName.endsWith(".doc") && !fileName.endsWith(".docx");

		if (!isPdf && !isDocx && !isTxt && !isLegacyDoc) {
			toast({
				title: "Preview unavailable",
				description: "This file type can't be opened in the viewer.",
				variant: "destructive",
			});
			return;
		}

		if (isLegacyDoc) {
			setPdfPreviewUrl((prev) => {
				if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
				return null;
			});
			setPreviewHtml(null);
			setPreviewText(null);
			setPreviewDownloadOnly(true);
			setPdfPreviewOpen(true);
			return;
		}

		const openFromBuffer = async (buffer: ArrayBuffer) => {
			fileBytesRef.current = buffer;
			setPreviewDownloadOnly(false);
			if (isDocx) {
				try {
					const mammoth = (await import("mammoth")).default;
					const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
					setPdfPreviewUrl((prev) => {
						if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
						return null;
					});
					setPreviewText(null);
					setPreviewHtml(result.value || "<p></p>");
					setPdfPreviewOpen(true);
				} catch {
					toast({
						title: "Preview unavailable",
						description: "Could not convert this Word file for preview.",
						variant: "destructive",
					});
				}
				return;
			}
			if (isTxt) {
				const text = new TextDecoder().decode(buffer);
				setPdfPreviewUrl((prev) => {
					if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
					return null;
				});
				setPreviewHtml(null);
				setPreviewText(text);
				setPdfPreviewOpen(true);
				return;
			}
			const url = URL.createObjectURL(
				new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
			);
			setPreviewHtml(null);
			setPreviewText(null);
			setPdfPreviewUrl((prev) => {
				if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
				return url;
			});
			setPdfPreviewOpen(true);
		};

		const fromRef = fileBytesRef.current;
		if (fromRef && fromRef.byteLength > 0) {
			await openFromBuffer(fromRef);
			return;
		}

		const fromState = toArrayBuffer(processedFileData.arrayBuffer);
		if (fromState) {
			await openFromBuffer(fromState);
			return;
		}

		if (processedFileData.base64Content) {
			const fromBase64 = base64ToArrayBuffer(processedFileData.base64Content);
			if (fromBase64) {
				await openFromBuffer(fromBase64);
				return;
			}
		}

		const bucketFileId = processedFileData.bucketFileId;
		if (bucketFileId) {
			try {
				const response = await fetch("/api/contracts/drafts/fetch-file", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ bucketFileId }),
				});
				if (response.ok) {
					const result = await response.json();
					const file = result.data?.file || result.file;
					const fetched = toArrayBuffer(file?.arrayBuffer);
					if (fetched) {
						setProcessedFileData((prev) =>
							prev
								? {
										...prev,
										arrayBuffer: fetched,
										bucketFileId,
									}
								: prev,
						);
						await openFromBuffer(fetched);
						return;
					}
					if (file?.downloadUrl && isPdf) {
						setPreviewHtml(null);
						setPreviewText(null);
						setPreviewDownloadOnly(false);
						setPdfPreviewUrl((prev) => {
							if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
							return file.downloadUrl as string;
						});
						setPdfPreviewOpen(true);
						return;
					}
				}
				const viewUrl = constructFileUrl(bucketFileId);
				if (viewUrl && isPdf) {
					setPreviewHtml(null);
					setPreviewText(null);
					setPreviewDownloadOnly(false);
					setPdfPreviewUrl((prev) => {
						if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
						return viewUrl;
					});
					setPdfPreviewOpen(true);
					return;
				}
			} catch (error) {
				console.error("Failed to fetch draft file for preview:", error);
			}
		}

		toast({
			title: "Preview unavailable",
			description:
				"Could not read the file data. Re-upload the file on step 1, then try again.",
			variant: "destructive",
		});
	}, [processedFileData, toast]);

	useEffect(() => {
		return () => {
			if (pdfPreviewUrl?.startsWith("blob:")) {
				URL.revokeObjectURL(pdfPreviewUrl);
			}
		};
	}, [pdfPreviewUrl]);

	// File drop handling with synchronous processing
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
					fileBytesRef.current = toArrayBuffer(processedData.arrayBuffer);
					setProcessedFileData(processedData);
					setFileIngestProgress(40);

					// Auto-extract data from contract using cached data (40–95%)
					setIsExtracting(true);
					let extractPct = 40;
					const extractTick = setInterval(() => {
						extractPct = Math.min(extractPct + 2, 92);
						setFileIngestProgress(extractPct);
					}, 180);

					try {
						const extracted = await extractContractData(processedData);
						setExtractedData(extracted);

						if (extracted) {
							const method = String(extracted.method || "");
							setExtractionMethod(method);

							const parsed = parseContractExtractionJson(
								JSON.stringify(extracted),
							);
							const patch = buildFormPatchFromExtraction(parsed, file.name);

							// Prefer API-provided confidence lists when present
							const filledFromApi = Array.isArray(extracted.filledFieldNames)
								? (extracted.filledFieldNames as string[])
								: parsed.filledFieldNames;
							const lowFromApi = Array.isArray(extracted.lowConfidenceFields)
								? (extracted.lowConfidenceFields as string[])
								: parsed.lowConfidenceFields;
							const confMap =
								(extracted.fieldConfidence as Record<string, number>) ||
								parsed.fieldConfidence;

							setAiFilledFields(
								isRealExtractionMethod(method) ? filledFromApi : [],
							);
							setLowConfidenceFields(
								isRealExtractionMethod(method) ? lowFromApi : [],
							);
							setFieldConfidence(isRealExtractionMethod(method) ? confMap : {});
							setOverallExtractionConfidence(
								isRealExtractionMethod(method)
									? typeof extracted.overallConfidence === "number"
										? (extracted.overallConfidence as number)
										: parsed.overallConfidence
									: null,
							);

							if (isRealExtractionMethod(method)) {
								if (
									needsDocumentNumber(
										typeof patch.contractNumber === "string"
											? patch.contractNumber
											: form.getValues("contractNumber"),
									)
								) {
									patch.contractNumber = generateDocumentNumber("CTR");
								}
								patch.lifecycleStatus = "draft";
								form.reset({
									...form.getValues(),
									...patch,
								});
							} else {
								// Stub / non-AI methods must not look like real extraction
								setExtractedData(null);
								setExtractionMethod(null);
								setAiFilledFields([]);
								setLowConfidenceFields([]);
								setFieldConfidence({});
								setOverallExtractionConfidence(null);
							}
						}
					} catch (error) {
						console.error("Failed to extract contract data:", error);
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
						if (needsDocumentNumber(form.getValues("contractNumber"))) {
							form.setValue("contractNumber", generateDocumentNumber("CTR"), {
								shouldDirty: true,
							});
						}
						form.setValue("lifecycleStatus", "draft");
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
		[form, processFileSynchronously, toast, extractContractData],
	);

	useEffect(() => {
		return () => {
			if (fileIngestSuccessTimeoutRef.current) {
				clearTimeout(fileIngestSuccessTimeoutRef.current);
			}
		};
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: getEnterpriseDropzoneAccept("contractPrimary"),
		onDropRejected: () => {
			toast({
				variant: "destructive",
				title: "File type not allowed",
				description: `${getEnterpriseFormatHint("contractPrimary")} (Max 50MB)`,
			});
		},
		multiple: false,
	});

	// Demo sample drags lack native "Files" in dataTransfer; react-dropzone
	// ignores them. Override drop handlers so we ingest before dropzone skips.
	const {
		onDragOver: dropzoneDragOver,
		onDrop: dropzoneDrop,
		...dropzoneRootRest
	} = getRootProps();

	const dropzoneRootProps = {
		...dropzoneRootRest,
		onDragOver: (event: React.DragEvent<HTMLElement>) => {
			if (handleDemoSampleDragOverCapture(event)) return;
			dropzoneDragOver?.(event);
		},
		onDrop: (event: React.DragEvent<HTMLElement>) => {
			if (handleDemoSampleDropCapture(event, onDrop)) return;
			dropzoneDrop?.(event);
		},
	};

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

	const sanitizeString = (value?: string) => scrubTemplateTokenValue(value);

	// Auto-save draft
	const autoSaveDraft = useCallback(
		async (options?: { silent?: boolean }): Promise<boolean> => {
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
			const silent = options?.silent === true;
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

				const response = await fetch("/api/contracts/drafts", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						ownerId,
						accountId,
						formData: {
							...formValues,
							...(selectedContractType ? { selectedContractType } : {}),
						},
						currentStep,
						processedFileData: filePayload,
						extractedData,
						selectedContractType, // Save contract type selection
						draftId: currentDraftId, // Pass draftId to update existing or create new
					}),
				});

				if (response.ok) {
					const result = await response.json();
					const draft = result.data?.draft || result.draft;
					// Store the draft ID if this is a new draft
					if (draft?.$id && !currentDraftId) {
						setCurrentDraftId(draft.$id);
					}
					// Keep bucketFileId on the client so preview/upload can use storage.
					// Only update when the id is new — a new object every save re-triggers auto-save.
					const savedFile =
						typeof draft?.processedFileData === "string"
							? JSON.parse(draft.processedFileData)
							: draft?.processedFileData;
					if (savedFile?.bucketFileId) {
						setProcessedFileData((prev) => {
							if (!prev || prev.bucketFileId === savedFile.bucketFileId) {
								return prev;
							}
							return { ...prev, bucketFileId: savedFile.bucketFileId };
						});
					}
					setLastSavedAt(new Date());
					if (!silent) {
						toast({
							title: "Progress saved",
							description: `Your progress has been saved (${Math.round(
								(currentStep / totalSteps) * 100,
							)}% complete)`,
							duration: 2000,
						});
					}
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
					// Show error toast only for manual saves
					if (!silent && currentStep > 1) {
						toast({
							title: "Save failed",
							description:
								errorData.error ||
								`Failed to save progress (${response.status})`,
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
		},
		[
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
		],
	);

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
		const success = await autoSaveDraft({ silent: false });
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

				// Leave drafts / type selection and jump to saved step before any
				// awaits (file fetch), or the form opens on step 1.
				setShowDraftsList(false);
				setShowAiQuiz(false);
				setShowTypeSelection(false);

				// Parse form data early so we can restore contract type (drives step count)
				let parsedFormData = draft.formData;
				if (typeof draft.formData === "string") {
					try {
						parsedFormData = JSON.parse(draft.formData);
					} catch {
						parsedFormData = {};
					}
				}

				const restoredTypeId = resolveDraftContractTypeId({
					selectedContractType: draft.selectedContractType,
					formData:
						parsedFormData && typeof parsedFormData === "object"
							? parsedFormData
							: null,
				});

				if (restoredTypeId) {
					setSelectedContractType(restoredTypeId);
				}

				const typeConfig = restoredTypeId
					? getContractTypeConfig(restoredTypeId)
					: null;
				const maxStep = (typeConfig?.steps || 10) + 1;
				const targetStep = Math.min(
					maxStep,
					Math.max(1, Number(draft.currentStep) || 1),
				);
				setCurrentStep(targetStep);
				setCurrentDraftId(draft.$id);

				// Prepare form values with proper date handling
				const formValues: Partial<ContractFormData> = { ...form.getValues() };
				if (parsedFormData) {
					Object.keys(parsedFormData).forEach((key) => {
						if (key === "selectedContractType") return;
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

				if (typeConfig && !formValues.contractType) {
					form.setValue("contractType", typeConfig.label);
				}

				// Set file data and extracted data
				if (draft.processedFileData) {
					const parsed =
						typeof draft.processedFileData === "string"
							? JSON.parse(draft.processedFileData)
							: draft.processedFileData;
					fileBytesRef.current =
						toArrayBuffer(parsed?.arrayBuffer) ||
						(parsed?.base64Content
							? base64ToArrayBuffer(parsed.base64Content)
							: null);

					setProcessedFileData(parsed);

					// Drafts store metadata only — pull bytes from storage when needed
					if (!fileBytesRef.current && parsed?.bucketFileId) {
						try {
							const fileRes = await fetch("/api/contracts/drafts/fetch-file", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									bucketFileId: parsed.bucketFileId,
								}),
							});
							if (fileRes.ok) {
								const fileJson = await fileRes.json();
								const file = fileJson.data?.file || fileJson.file;
								const fetched = toArrayBuffer(file?.arrayBuffer);
								if (fetched) {
									fileBytesRef.current = fetched;
									setProcessedFileData({
										...parsed,
										arrayBuffer: fetched,
										bucketFileId: parsed.bucketFileId,
									});
								}
							}
						} catch (fileError) {
							console.error("Failed to restore draft file bytes:", fileError);
						}
					}
				}

				if (draft.extractedData) {
					try {
						const extracted =
							typeof draft.extractedData === "string"
								? JSON.parse(draft.extractedData)
								: draft.extractedData;
						setExtractedData(extracted);
					} catch {
						setExtractedData(draft.extractedData);
					}
				}

				// Keep dialog open (already open when resuming from Drafts)
				setIsOpen(true);

				// Clear the resume flag after a delay to allow auto-save to resume
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

	// Ask to delete a draft (inline confirmation on its card)
	const handleDeleteClick = useCallback((draftId: string) => {
		setDraftToDelete(draftId);
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

	// Auto-save on step change only (not when processedFileData / draft id update after save)
	useEffect(() => {
		if (isResumingDraftRef.current) {
			return; // Don't auto-save while resuming a draft
		}
		// Only auto-save when user has progressed to step 2 or beyond
		if (currentStep > 1 && processedFileData) {
			const timeout = setTimeout(() => {
				if (!isResumingDraftRef.current) {
					void autoSaveDraft({ silent: true });
				}
			}, 2000); // Save 2 seconds after step change
			return () => clearTimeout(timeout);
		}
		// Intentionally omit autoSaveDraft / processedFileData — those change after each
		// save and would re-trigger an endless save + toast loop.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentStep]);

	// Auto-save when dialog is about to close (only if user has progressed to step 2)
	useEffect(() => {
		// Only save to database if user has progressed to step 2 or beyond
		if (!isOpen && currentStep > 1 && processedFileData) {
			// Save draft when dialog closes (silent save, no toast)
			const saveOnClose = async () => {
				try {
					const formValues = form.getValues();
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
					await fetch("/api/contracts/drafts", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							ownerId,
							accountId,
							formData: {
								...formValues,
								...(selectedContractType ? { selectedContractType } : {}),
							},
							currentStep,
							processedFileData: filePayload,
							extractedData,
							selectedContractType,
							draftId: currentDraftId,
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
		const resolvedAssignees =
			selectedManagers?.length > 0
				? selectedManagers
				: filteredManagers[0]
					? [filteredManagers[0].$id]
					: ownerId
						? [ownerId]
						: [];
		if (resolvedAssignees.length === 0) {
			toast({
				title: "Assigned To is required",
				description: "Every contract needs an assignee before upload.",
				variant: "destructive",
			});
			return;
		}
		if (resolvedAssignees !== selectedManagers) {
			setSelectedManagers(resolvedAssignees);
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
			const contractNumber = needsDocumentNumber(values.contractNumber)
				? generateDocumentNumber("CTR")
				: values.contractNumber.trim();

			const contractPayload = {
				contractName: values.contractName,
				contractType: values.contractType,
				contractCategory: values.contractCategory,
				lifecycleStatus: "draft",
				contractNumber,
				description: (() => {
					const d = sanitizeString(values.description);
					return d && d.length > 1000 ? d.slice(0, 1000) : d;
				})(),
				assignToDepartment: values.assignToDepartment,
				department: values.assignToDepartment,
				businessUnit:
					sanitizeString(values.businessUnit) || values.assignToDepartment,
				subDepartment: sanitizeString(values.subDepartment),
				division: sanitizeString(values.subDepartment),
				departmentOwner: (() => {
					const raw = sanitizeString(values.departmentOwner);
					if (!raw) return undefined;
					const owners = [...filteredManagers, ...availableManagers];
					const match = owners.find((m) => m.$id === raw || m.fullName === raw);
					return match?.fullName || raw;
				})(),
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
				counterpartyLegalName:
					sanitizeString(values.counterpartyLegalName) ||
					values.counterpartyLegalName,
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
				assignedManagers: resolvedAssignees,
				internalApproverIds: selectedApprovers,
				digitalSignatureRequired: values.digitalSignatureRequired,
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
				digitalSignatureStatus: values.digitalSignatureRequired
					? ("pending" as const)
					: undefined,
				searchKeywords: sanitizeString(values.searchKeywords),
				accessScope: sanitizeString(values.accessScope),
			};

			// Create File object from cached data for upload
			const uploadBuffer =
				fileBytesRef.current ||
				toArrayBuffer(processedFileData.arrayBuffer) ||
				(processedFileData.base64Content
					? base64ToArrayBuffer(processedFileData.base64Content)
					: null);
			if (!uploadBuffer) {
				throw new Error(
					"Contract file data is missing. Re-upload the PDF on step 1.",
				);
			}
			const fileForUpload = new File(
				[new Uint8Array(uploadBuffer)],
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

			await refreshStorageUsage(router);

			clearInterval(progressInterval);
			setUploadProgress(100);

			toast({
				title: "Contract Uploaded Successfully",
				description: `${values.contractName} has been uploaded and processed.`,
			});

			fireConfetti({ durationMs: 2800, particleCount: 140 });
			await new Promise((resolve) => setTimeout(resolve, 900));

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
		<>
			<Dialog
				open={isOpen}
				onOpenChange={(open) => {
					setIsOpen(open);
					if (!open) {
						closePdfPreview();
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
						className={cn(`${cta} px-4 shadow-drop-1 text-sm gap-2`, className)}
					>
						<Upload className="h-4 w-4" />
						{triggerLabel}
					</Button>
				</DialogTrigger>

				<DialogContent
					className={cn(
						"glass-dialog",
						// Override .glass-dialog sm:max-w-4xl when viewing drafts
						showDraftsList &&
							(savedDrafts.length > 0 ? "sm:max-w-2xl!" : "sm:max-w-md!"),
					)}
					onPointerDownOutside={(e) => {
						// PDF preview is portaled outside this dialog — don't dismiss on those clicks
						if (
							pdfPreviewOpen ||
							(e.target as HTMLElement | null)?.closest?.("[data-pdf-preview]")
						) {
							e.preventDefault();
						}
					}}
					onInteractOutside={(e) => {
						if (
							pdfPreviewOpen ||
							(e.target as HTMLElement | null)?.closest?.("[data-pdf-preview]")
						) {
							e.preventDefault();
						}
					}}
					onFocusOutside={(e) => {
						if (
							pdfPreviewOpen ||
							(e.target as HTMLElement | null)?.closest?.("[data-pdf-preview]")
						) {
							e.preventDefault();
						}
					}}
					onEscapeKeyDown={(e) => {
						if (pdfPreviewOpen) {
							e.preventDefault();
							closePdfPreview();
						}
					}}
				>
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>Upload Contract</DialogTitle>
					</VisuallyHiddenPrimitive.Root>

					{/* Contract Type Selection Screen */}
					{showTypeSelection &&
					!selectedContractType &&
					!showAiQuiz &&
					!showDraftsList ? (
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
							{/* Header */}
							<div className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-[22px] pr-12">
								<div className="flex items-center gap-2.5">
									<div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[#0f5384]/15 bg-white">
										<FileText
											className="h-[17px] w-[17px] text-[#0f5384]"
											aria-hidden
										/>
									</div>
									<h2 className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]">
										Select Contract Type
									</h2>
								</div>
								<p className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
									Choose the type of contract you want to upload. This will
									customize the form fields to match your specific contract
									requirements.
								</p>
							</div>

							{/* Body */}
							<div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-1 pt-[18px]">
								<p className={TYPE_SELECT_LABEL}>Saved drafts</p>
								<div
									role="button"
									tabIndex={0}
									aria-label={`Drafts — ${savedDrafts.length === 0 ? "No drafts saved" : `${savedDrafts.length} draft${savedDrafts.length === 1 ? "" : "s"}`}`}
									className={cn(
										"group mb-[18px] flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-slate-200 bg-white/80 px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-200",
										"hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_12px_rgba(7,143,171,0.10)]",
										"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]",
									)}
									onClick={() => {
										void loadSavedDrafts();
										setShowDraftsList(true);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											void loadSavedDrafts();
											setShowDraftsList(true);
										}
									}}
								>
									<div className={cn(TYPE_SELECT_ICON_TILE, "h-9 w-9")}>
										<FolderOpen
											className="h-[17px] w-[17px] text-[#0f5384]"
											aria-hidden
										/>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-bold text-[#0f5384]">Drafts</p>
										<p className="text-xs leading-snug text-slate-500">
											Resume a contract you started earlier and pick up where
											you left off without re-entering details
										</p>
									</div>
									<span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-slate-400">
										<Info className="h-3 w-3" aria-hidden />
										{savedDrafts.length === 0
											? "No drafts saved"
											: `${savedDrafts.length} draft${savedDrafts.length === 1 ? "" : "s"}`}
									</span>
								</div>

								<p className={TYPE_SELECT_LABEL}>Contract types</p>
								<div className="grid grid-cols-3 gap-3 pb-4">
									{CONTRACT_TYPE_CONFIGS.map((type) => {
										const IconComponent = getIconComponent(type.icon);
										const disabled = !isDemoContractTypeAllowed(type.id);
										return (
											<div
												key={type.id}
												role="button"
												tabIndex={disabled ? -1 : 0}
												aria-disabled={disabled}
												aria-label={`${type.label} — ${type.steps} steps`}
												className={cn(
													"group flex flex-col rounded-xl border-[1.5px] border-slate-200 bg-white/80 px-3.5 pb-3 pt-3.5 transition-[border-color,background-color,box-shadow] duration-200",
													disabled
														? "pointer-events-none cursor-not-allowed opacity-50"
														: "cursor-pointer hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_12px_rgba(7,143,171,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]",
												)}
												onClick={() => {
													if (disabled) return;
													handleContractTypeSelect(type.id);
												}}
												onKeyDown={(e) => {
													if (disabled) return;
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleContractTypeSelect(type.id);
													}
												}}
											>
												<div
													className={cn(
														TYPE_SELECT_ICON_TILE,
														"mb-2.5 h-8 w-8 rounded-lg",
													)}
												>
													<IconComponent
														className="h-4 w-4 text-[#0f5384]"
														aria-hidden
													/>
												</div>
												<h3 className="mb-[5px] text-[13.5px] font-bold leading-tight text-[#0f5384]">
													{type.label}
												</h3>
												<p className="flex-1 text-[11.5px] leading-normal text-slate-500">
													{type.description}
												</p>
												<div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
													<span className="text-[11px] font-semibold text-slate-400">
														{type.steps} steps
													</span>
													<span
														className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#078fab]/[.08] text-[#078fab] transition-[transform,background-color] duration-200 group-hover:translate-x-0.5 group-hover:bg-[#078fab]/[.16]"
														aria-hidden
													>
														<ArrowRight className="h-2.5 w-2.5" />
													</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Footer */}
							<div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-[22px] pb-3.5 pt-3">
								<p className="flex items-center gap-1.5 text-xs text-slate-500">
									<CircleHelp
										className="h-[13px] w-[13px] shrink-0 text-[#078fab]"
										aria-hidden
									/>
									Need help? Use CAALM AI Assistant to pick the best contract
									type.
								</p>
								<button
									type="button"
									onClick={() => setShowAiQuiz(true)}
									className={cn(
										AI_ASSISTANT_OPEN_CHIP_CLASS,
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/30",
									)}
								>
									<Image
										src="/assets/icons/ai-icon.svg"
										alt=""
										width={22}
										height={22}
									/>
									<span className="text-xs font-semibold text-[#0f5384]">
										Open Contract Type assistant
									</span>
								</button>
							</div>
						</div>
					) : showDraftsList ? (
						/* Drafts list view — content-sized (not stretched to type-picker height) */
						<div className="flex flex-col overflow-hidden bg-transparent">
							{/* Header: Back shares a row with the dialog's close button */}
							<div className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-4 pr-12">
								<div className="mb-2 flex h-8 items-center">
									<button
										type="button"
										onClick={() => {
											setDraftToDelete(null);
											setShowDraftsList(false);
										}}
										className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]"
									>
										<ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
										Back
									</button>
								</div>
								<div className="flex items-center gap-2.5">
									<div
										className={cn(
											TYPE_SELECT_ICON_TILE,
											"h-[34px] w-[34px] bg-white",
										)}
									>
										<FolderOpen
											className="h-[17px] w-[17px] text-[#0f5384]"
											aria-hidden
										/>
									</div>
									<h2
										id="drafts-title"
										className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]"
									>
										Drafts
									</h2>
								</div>
								<p className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
									Resume a saved upload or delete drafts you no longer need.
								</p>
							</div>

							<div className="max-h-[60vh] overflow-y-auto px-[22px] pb-3 pt-[18px]">
								{savedDrafts.length === 0 ? (
									<div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
										<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#0f5384]/10 bg-white">
											<FolderOpen
												className="h-5 w-5 text-[#0f5384]"
												aria-hidden
											/>
										</div>
										<p className="text-[13.5px] font-semibold text-slate-700">
											No saved drafts
										</p>
										<p className="max-w-[280px] text-xs leading-normal text-slate-500">
											Drafts you save during an upload will appear here so you
											can pick up where you left off.
										</p>
									</div>
								) : (
									<>
										<p className={TYPE_SELECT_LABEL}>
											{savedDrafts.length === 1
												? "1 saved draft"
												: `${savedDrafts.length} saved drafts`}
										</p>
										{savedDrafts.map((draft) => {
											const restoredTypeId = resolveDraftContractTypeId({
												selectedContractType: draft.selectedContractType,
												formData:
													draft.formData && typeof draft.formData === "object"
														? draft.formData
														: null,
											});
											const typeConfig = restoredTypeId
												? getContractTypeConfig(restoredTypeId)
												: null;
											const draftStepTitles = typeConfig
												? [...typeConfig.stepTitles, "Review"]
												: [];
											const stepLabel =
												draftStepTitles[draft.currentStep - 1] ||
												`Step ${draft.currentStep}`;
											const pct = Math.max(
												0,
												Math.min(100, Number(draft.progressPercentage) || 0),
											);
											const confirming = draftToDelete === draft.$id;
											const removing = deletingDraftId === draft.$id;
											return (
												<div
													key={draft.$id}
													className={cn(
														"mb-2.5 overflow-hidden rounded-xl border-[1.5px] border-slate-200 bg-white/80 p-4 transition-[border-color,box-shadow,opacity,max-height,margin,padding] duration-200",
														"hover:border-[#078fab]/30 hover:shadow-[0_2px_12px_rgba(7,143,171,0.08)]",
														removing
															? "pointer-events-none mb-0 max-h-0 border-transparent p-0 opacity-0"
															: "max-h-80",
													)}
												>
													<div className="mb-2.5 min-w-0">
														<p className="truncate text-[13.5px] font-bold text-slate-700">
															{draft.formData?.contractName ||
																"Untitled Contract"}
														</p>
														<p className="mt-0.5 text-[11.5px] text-slate-500">
															{typeConfig?.label ? (
																<>
																	{typeConfig.label}
																	<span
																		className="mx-1.5 text-slate-300"
																		aria-hidden
																	>
																		·
																	</span>
																</>
															) : null}
															Step {draft.currentStep}: {stepLabel}
														</p>
														<p className="mt-0.5 text-[11px] text-slate-400">
															Saved{" "}
															{new Date(draft.lastSavedAt).toLocaleDateString(
																"en-US",
															)}
														</p>
													</div>
													<div className="flex flex-wrap items-center gap-2.5">
														<span
															className={cn(
																"whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold",
																pct < 50
																	? "border-[#078fab]/20 bg-[#078fab]/10 text-[#078fab]"
																	: pct < 75
																		? "border-[#0e638f]/20 bg-[#0e638f]/10 text-[#0e638f]"
																		: "border-[#0f5384]/20 bg-[#0f5384]/10 text-[#0f5384]",
															)}
														>
															{pct}% Complete
														</span>
														<div
															className="h-[3px] min-w-[60px] flex-1 overflow-hidden rounded-full bg-slate-100"
															role="progressbar"
															aria-valuenow={pct}
															aria-valuemin={0}
															aria-valuemax={100}
															aria-label="Draft completion"
														>
															<div
																className="h-full rounded-full bg-[linear-gradient(90deg,#00c1cb,#078fab,#0e638f)] transition-[width] duration-300"
																style={{ width: `${pct}%` }}
															/>
														</div>
														{confirming ? (
															<div className="flex shrink-0 items-center gap-2">
																<span className="text-[12.5px] font-semibold text-[#dc2626]">
																	Delete this draft?
																</span>
																<button
																	type="button"
																	onClick={() => setDraftToDelete(null)}
																	className={AI_QUIZ_GHOST_BTN_CLASS}
																>
																	Cancel
																</button>
																<button
																	type="button"
																	onClick={async () => {
																		setDraftToDelete(null);
																		setDeletingDraftId(draft.$id);
																		await new Promise((resolve) =>
																			setTimeout(resolve, 200),
																		);
																		await deleteDraft(draft.$id);
																		setDeletingDraftId(null);
																	}}
																	className={DRAFT_DELETE_BTN_CLASS}
																>
																	Confirm Delete
																</button>
															</div>
														) : (
															<div className="flex shrink-0 items-center gap-1.5">
																<button
																	type="button"
																	onClick={() => handleDeleteClick(draft.$id)}
																	aria-label="Delete draft"
																	title="Delete draft"
																	className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-[#dc2626]/[.08] hover:text-[#dc2626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626]"
																>
																	<Trash2 className="h-4 w-4" aria-hidden />
																</button>
																<Button
																	type="button"
																	size="sm"
																	onClick={() => {
																		void resumeDraft(draft);
																	}}
																	className="btn-primary gap-1.5 text-xs"
																>
																	<StepForward className="h-3 w-3" />
																	Resume
																</Button>
															</div>
														)}
													</div>
												</div>
											);
										})}
									</>
								)}
							</div>
						</div>
					) : showAiQuiz ? (
						/* AI Quiz View */
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
							{/* Header: Back shares a row with the dialog's close button */}
							<div className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-4 pr-12">
								<div className="mb-2 flex h-8 items-center">
									{aiQuizPhase === "loading" ? null : (
										<button
											type="button"
											onClick={handleAiQuizBack}
											className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]"
										>
											<ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
											Back
										</button>
									)}
								</div>
								<div className="flex items-center gap-2.5">
									<div
										className={cn(
											TYPE_SELECT_ICON_TILE,
											"h-[34px] w-[34px] bg-white",
										)}
									>
										<CircleHelp
											className="h-[17px] w-[17px] text-[#0f5384]"
											aria-hidden
										/>
									</div>
									<h2
										id="quiz-title"
										className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]"
									>
										CAALM AI Assistant
									</h2>
								</div>
								<p className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
									Answer a few questions to find the best contract type for your
									needs.
								</p>
							</div>

							{/* Quiz Content */}
							<div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
								<div className="mx-auto w-full max-w-xl">
									<div className="mb-5 flex justify-center">
										<SegmentedToggle
											ariaLabel="Assistant steps"
											className="max-w-full"
											value={
												aiQuizPhase === "questions"
													? `q${aiQuizStep}`
													: "results"
											}
											onChange={handleAiQuizTab}
											tabs={[
												...visibleAiQuizQuestions.map((q, index) => ({
													value: `q${index}`,
													label: `Q${index + 1}`,
													ariaLabel: `Question ${index + 1}: ${q.text}`,
													// Only answered questions (and the current one) can be revisited.
													disabled:
														aiQuizPhase === "loading" ||
														(aiQuizPhase === "questions" && index > aiQuizStep),
												})),
												{
													value: "results",
													label: "Results",
													disabled: aiQuizPhase !== "result",
												},
											]}
										/>
									</div>
									<AnimatePresence mode="wait">
										{aiQuizPhase === "questions" &&
											visibleAiQuizQuestions.length > 0 && (
												<motion.div
													key={`question-${visibleAiQuizQuestions[aiQuizStep]?.id ?? aiQuizStep}`}
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
													className="w-full"
												>
													{aiQuizStep < visibleAiQuizQuestions.length ? (
														<>
															<h3
																id={`quiz-q-${visibleAiQuizQuestions[aiQuizStep].id}`}
																className="mb-4 text-[15px] font-bold leading-snug text-slate-700"
															>
																{visibleAiQuizQuestions[aiQuizStep].text}
															</h3>
															{visibleAiQuizQuestions[aiQuizStep].kind ===
															"freeText" ? (
																<Textarea
																	value={aiQuizFreeTextDraft}
																	onChange={(e) =>
																		setAiQuizFreeTextDraft(e.target.value)
																	}
																	aria-labelledby={`quiz-q-${visibleAiQuizQuestions[aiQuizStep].id}`}
																	placeholder="e.g. Annual lease for our program office…"
																	className="min-h-[120px] resize-y rounded-[10px] border-[1.5px] border-slate-200 bg-white/85 px-3.5 py-3 text-[13.5px] leading-normal text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:border-[#078fab] focus-visible:ring-[3px] focus-visible:ring-[#078fab]/10"
																/>
															) : (
																<div
																	role="group"
																	aria-labelledby={`quiz-q-${visibleAiQuizQuestions[aiQuizStep].id}`}
																	className="space-y-2"
																>
																	{visibleAiQuizQuestions[
																		aiQuizStep
																	].options.map((opt) => (
																		<button
																			key={opt.value}
																			type="button"
																			onClick={() =>
																				handleAiQuizChoice(opt.value)
																			}
																			className={AI_QUIZ_OPTION_CLASS}
																		>
																			<span className="flex-1 text-[13.5px] font-semibold text-slate-700">
																				{opt.label}
																			</span>
																			<span
																				className={AI_QUIZ_ARROW_CHIP_CLASS}
																				aria-hidden
																			>
																				<ArrowRight className="h-2.5 w-2.5" />
																			</span>
																		</button>
																	))}
																</div>
															)}
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
												className="flex flex-col items-center justify-center gap-3.5 py-12"
											>
												<div
													className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-100 border-t-[#078fab]"
													aria-hidden
												/>
												<p
													className="text-[13px] text-slate-500"
													aria-live="polite"
												>
													Finding the best match for your needs…
												</p>
											</motion.div>
										)}

										{aiQuizPhase === "result" &&
											aiSuggestion &&
											(() => {
												const orderedIds: string[] = [
													aiSuggestion.primaryTypeId,
												];
												for (const a of aiSuggestion.alternates) {
													if (!orderedIds.includes(a.typeId))
														orderedIds.push(a.typeId);
												}
												const visibleIds = isDemoMode()
													? orderedIds.filter((id) =>
															isDemoContractTypeAllowed(id),
														)
													: orderedIds;
												return (
													<motion.div
														key="result"
														initial={{ opacity: 0, x: 100 }}
														animate={{ opacity: 1, x: 0 }}
														className="w-full"
													>
														<div className="mb-3.5 flex items-center justify-between">
															<p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
																Recommended for you
															</p>
															<span
																className="text-[11px] text-slate-400"
																aria-live="polite"
															>
																{visibleIds.length}{" "}
																{visibleIds.length === 1 ? "result" : "results"}
															</span>
														</div>
														{aiSuggestion.rationale ? (
															<p className="mb-3.5 text-[12.5px] leading-normal text-slate-500">
																{aiSuggestion.rationale}
															</p>
														) : null}
														{aiSuggestion.confidence < 0.4 ? (
															<p className="mb-3.5 rounded-[10px] border border-[#F9AB72]/30 bg-[#F9AB72]/10 px-4 py-3 text-center text-[13px] leading-normal text-[#b45309]">
																We couldn&apos;t confidently match your needs.
																Review the options below, browse all contract
																types, or retake the quiz with more detail.
															</p>
														) : null}
														{visibleIds.length === 0 ? (
															<p className="py-5 text-center text-[13px] leading-normal text-slate-500">
																None of these suggestions are available. Browse
																all contract types instead.
															</p>
														) : null}
														{visibleIds.map((typeId, idx) => {
															const config = getContractTypeConfig(typeId);
															if (!config) return null;
															const IconComponent = getIconComponent(
																config.icon,
															);
															const best = idx === 0;
															const choose = () => {
																handleContractTypeSelect(config.id);
																closeAiQuiz();
															};
															return (
																<div
																	key={typeId}
																	role="button"
																	tabIndex={0}
																	aria-label={`${config.label} — ${config.steps} steps`}
																	onClick={choose}
																	onKeyDown={(e) => {
																		if (e.key === "Enter" || e.key === " ") {
																			e.preventDefault();
																			choose();
																		}
																	}}
																	className={cn(
																		"group mb-2.5 flex cursor-pointer flex-col rounded-xl border-[1.5px] bg-white/85 p-3.5 transition-[border-color,background-color,box-shadow] duration-150",
																		"hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_12px_rgba(7,143,171,0.10)]",
																		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]",
																		best
																			? "border-[#078fab]/35"
																			: "border-slate-200",
																	)}
																>
																	<div className="mb-2.5 flex items-center gap-2">
																		<span
																			className={cn(
																				"rounded-md border px-2 py-[3px] text-[11px] font-semibold",
																				best
																					? "border-[#078fab]/25 bg-[#078fab]/10 text-[#078fab]"
																					: "border-[#F9AB72]/30 bg-[#F9AB72]/10 text-[#b45309]",
																			)}
																		>
																			{best
																				? aiSuggestion.confidence === 0
																					? "Default"
																					: "✦ Best match"
																				: "Also consider"}
																		</span>
																		{best && aiSuggestion.confidence > 0 ? (
																			<span className="text-[11.5px] font-bold text-[#078fab]">
																				{Math.round(
																					aiSuggestion.confidence * 100,
																				)}
																				% match
																			</span>
																		) : null}
																	</div>
																	<div className="mb-2.5 flex items-start gap-3">
																		<div
																			className={cn(
																				TYPE_SELECT_ICON_TILE,
																				"h-8 w-8 rounded-lg",
																			)}
																		>
																			<IconComponent
																				className="h-4 w-4 text-[#0f5384]"
																				aria-hidden
																			/>
																		</div>
																		<div className="min-w-0 flex-1">
																			<p className="text-sm font-bold text-[#0f5384]">
																				{config.label}
																			</p>
																			<p className="text-xs leading-snug text-slate-500">
																				{config.description}
																			</p>
																		</div>
																	</div>
																	<div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
																		<span className="text-[11px] font-semibold text-slate-400">
																			{config.steps} steps
																		</span>
																		<span
																			className={AI_QUIZ_ARROW_CHIP_CLASS}
																			aria-hidden
																		>
																			<ArrowRight className="h-2.5 w-2.5" />
																		</span>
																	</div>
																</div>
															);
														})}
													</motion.div>
												);
											})()}
									</AnimatePresence>
								</div>
							</div>

							{/* Footer */}
							<div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 pb-4 pt-3.5">
								{aiQuizPhase === "result" ? (
									<>
										<Button
											type="button"
											onClick={closeAiQuiz}
											className="btn-secondary"
										>
											Browse all types
										</Button>
										<button
											type="button"
											onClick={resetAiQuiz}
											className={AI_QUIZ_GHOST_BTN_CLASS}
										>
											Retake quiz
										</button>
									</>
								) : aiQuizPhase === "loading" ? (
									<>
										<span />
										<button
											type="button"
											disabled
											className={AI_QUIZ_CTA_CLASS}
										>
											Get recommendations
										</button>
									</>
								) : visibleAiQuizQuestions[aiQuizStep]?.kind === "freeText" ? (
									<>
										<span />
										<div className="flex items-center gap-1">
											<button
												type="button"
												onClick={() => handleAiQuizFreeTextContinue(true)}
												className={AI_QUIZ_GHOST_BTN_CLASS}
											>
												Skip
											</button>
											<button
												type="button"
												onClick={() => handleAiQuizFreeTextContinue(false)}
												className={AI_QUIZ_CTA_CLASS}
											>
												Get suggestions
											</button>
										</div>
									</>
								) : (
									<p className="text-xs text-slate-500">
										Choose an option to continue.
									</p>
								)}
							</div>
						</div>
					) : (
						<>
							{/* Sticky Header — frosted strip */}
							<div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-white/50 py-4 backdrop-blur-xl">
								<div className="px-6">
									<div className="mb-2 flex h-8 items-center pr-10">
										{currentStep === 1 && selectedContractType ? (
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
												Change Type
											</button>
										) : currentStep > 1 ? (
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
										) : null}
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
												<div className="flex flex-wrap items-baseline gap-2.5">
													<h2 className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]">
														Upload Contract
													</h2>
													{selectedContractType && currentTypeConfig && (
														<span className="rounded-full border border-[#078fab]/[.22] bg-[#078fab]/[.09] px-[9px] py-0.5 text-[11.5px] font-semibold text-[#078fab]">
															{currentTypeConfig.label}
														</span>
													)}
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

									{/* Progress Bar */}
									<div className="-mx-6 h-[3px] overflow-hidden bg-slate-100">
										<div
											className="h-full rounded-[0_99px_99px_0] bg-[linear-gradient(90deg,#00c1cb,#078fab,#0e638f)] transition-[width] duration-300 ease-out"
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
																		? "border border-white/35 bg-white/35 text-slate-600 backdrop-blur-sm hover:bg-white/50"
																		: "cursor-not-allowed border border-white/20 bg-white/15 text-slate-400",
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
							<div
								ref={stepScrollRef}
								className="min-h-0 flex-1 overflow-y-auto bg-transparent p-4"
							>
								<Form {...form}>
									<CaalmFilledProvider
										value={{
											names: aiFilledFields,
											confidence: fieldConfidence,
											lowThreshold: LOW_EXTRACTION_CONFIDENCE,
										}}
									>
										<form
											id="contract-upload-form"
											onSubmit={form.handleSubmit(handleSubmit)}
											className="space-y-6"
										>
											{/* Step 1: File Upload Section */}
											{currentStep === 1 && (
												<div>
													<div className="mb-3.5 flex items-center gap-3">
														<h3 className="text-[13.5px] font-bold text-[#0f5384]">
															1. Upload Contract File
														</h3>
														<AnimatePresence mode="wait">
															{fileIngestUi === "progress" ? (
																<motion.div
																	key="file-ingest-progress"
																	initial={{ opacity: 0, x: -6 }}
																	animate={{ opacity: 1, x: 0 }}
																	exit={{ opacity: 0, scale: 0.9 }}
																	transition={{ duration: 0.2 }}
																	className="flex min-w-0 items-center gap-2"
																	aria-live="polite"
																	aria-label={`Upload ${fileIngestProgress}% complete`}
																>
																	<div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 sm:w-28">
																		<div
																			className="h-full rounded-full bg-[#078FAB] transition-[width] duration-200 ease-out"
																			style={{
																				width: `${fileIngestProgress}%`,
																			}}
																		/>
																	</div>
																	<span className="tabular-nums text-xs font-medium text-slate-600">
																		{fileIngestProgress}%
																	</span>
																</motion.div>
															) : null}
															{fileIngestUi === "success" ? (
																<motion.div
																	key="file-ingest-success"
																	initial={{ opacity: 0, scale: 0.5 }}
																	animate={{ opacity: 1, scale: 1 }}
																	exit={{ opacity: 0, scale: 0.8 }}
																	transition={{
																		type: "spring",
																		stiffness: 420,
																		damping: 18,
																	}}
																	className="flex items-center"
																	aria-label="Upload complete"
																>
																	<CheckCircle2
																		className="h-5 w-5 text-green"
																		strokeWidth={2.25}
																	/>
																</motion.div>
															) : null}
														</AnimatePresence>
													</div>
													<div
														{...dropzoneRootProps}
														className={cn(
															"flex flex-col items-center rounded-[14px] border-[1.5px] border-dashed border-[#078fab]/35 bg-[#078fab]/[.025] text-center transition-[border-color,background-color] duration-200",
															processedFileData
																? "cursor-default gap-3 px-6 py-5"
																: "cursor-pointer gap-4 px-6 py-8 hover:border-[#078fab]/60 hover:bg-[#078fab]/[.045]",
															isDragActive &&
																"border-[#078fab]/60 bg-[#078fab]/[.045]",
														)}
													>
														<input {...getInputProps()} />

														{processedFileData ? (
															<>
																<span className="inline-flex items-center gap-1.5 rounded-full border border-[#078fab]/20 bg-[#078fab]/[.08] py-1 pl-1.5 pr-2.5 text-[11.5px] font-semibold text-[#078fab]">
																	<Check className="h-3.5 w-3.5" aria-hidden />
																	File ready
																</span>
																<div className="flex w-full max-w-[480px] items-center gap-3.5 rounded-xl border-[1.5px] border-[#078fab]/[.22] bg-white/80 px-4 py-3.5 text-left">
																	<div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] border border-[#078fab]/[.18] bg-[#078fab]/[.08]">
																		<FileText
																			className="h-[18px] w-[18px] text-[#078fab]"
																			aria-hidden
																		/>
																	</div>
																	<div className="min-w-0 flex-1">
																		<p className="truncate text-[13px] font-semibold text-slate-700">
																			{processedFileData.name}
																		</p>
																		<p className="text-[11px] text-slate-400">
																			{(
																				processedFileData.size /
																				1024 /
																				1024
																			).toFixed(2)}{" "}
																			MB ·{" "}
																			{(
																				processedFileData.name
																					.split(".")
																					.pop() || "FILE"
																			).toUpperCase()}
																		</p>
																	</div>
																	<button
																		type="button"
																		onClick={(event) => {
																			event.stopPropagation();
																			clearUploadedFile();
																		}}
																		disabled={isExtracting || isUploading}
																		aria-label="Remove file"
																		title="Remove file"
																		className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[7px] text-slate-400 transition-colors duration-200 hover:bg-[#dc2626]/[.08] hover:text-[#dc2626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
																	>
																		<X className="h-3.5 w-3.5" aria-hidden />
																	</button>
																</div>
															</>
														) : (
															<>
																<div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-[#0f5384]/[.12] bg-[#0f5384]/[.06]">
																	<Upload
																		className="h-6 w-6 text-[#0f5384]/70"
																		aria-hidden
																	/>
																</div>
																<p className="text-[13.5px] font-semibold text-slate-600">
																	{isDragActive ? (
																		"Drop the contract here"
																	) : (
																		<>
																			<span className="text-[#078fab] underline">
																				Click to upload
																			</span>{" "}
																			or drag &amp; drop here
																		</>
																	)}
																</p>
																<p className="text-[11.5px] text-slate-400">
																	{getEnterpriseFormatHint("contractPrimary")} ·
																	up to 50 MB
																</p>
															</>
														)}

														{isExtracting && (
															<div className="flex items-center justify-center space-x-2">
																<Loader2 className="h-4 w-4 animate-spin text-[#078fab]" />
																<span className="text-sm text-slate-500">
																	Extracting contract data...
																</span>
															</div>
														)}
													</div>

													{!processedFileData ? (
														<DemoSampleDocumentDrop
															sample={DEMO_CONTRACT_SAMPLE}
															disabled={isExtracting || isUploading}
															onUseSample={(file) => onDrop([file])}
															className="mt-4"
														/>
													) : null}
												</div>
											)}

											{/* Steps 2–N: Contract Details Sections */}
											{currentStep >= 2 && currentStep <= contentSteps && (
												<div className="">
													<AiExtractionReviewPanel
														method={extractionMethod}
														overallConfidence={overallExtractionConfidence}
														filledCount={aiFilledFields.length}
														lowConfidenceFields={lowConfidenceFields}
													/>
													<div className="mb-4">
														<h3 className="text-lg font-semibold text-slate-700">
															{currentStep}. {stepTitles[currentStep - 1]}
														</h3>
													</div>
													<div className="space-y-6">
														{/* Step 2: Contract Basics & Timeline */}
														{!isDigitalSignaturesStep && currentStep === 2 && (
															<div className="space-y-4">
																<div className="grid grid-cols-1 gap-y-3.5">
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
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																					value={field.value}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select contract type" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{CONTRACT_TYPES.map((type) => (
																							<SelectItem
																								key={type}
																								value={type}
																							>
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
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="lifecycleStatus"
																		render={() => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Lifecycle Status{" "}
																					<span className="text-red">*</span>
																				</FormLabel>
																				<div className="flex items-start gap-2.5">
																					<span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-[#b45309]">
																						Draft
																					</span>
																					<span className="pt-0.5 text-[11px] leading-normal text-slate-400">
																						New uploads start as Draft. Review
																						and Execute move the status later.
																					</span>
																				</div>
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
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="assignToDepartment"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Department{" "}
																					<span className="text-red">*</span>
																				</FormLabel>
																				<Select
																					onValueChange={(value) => {
																						field.onChange(value);
																						form.setValue(
																							"businessUnit",
																							value,
																						);
																					}}
																					value={field.value}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select department" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{CONTRACT_DEPARTMENTS.map(
																							(dept) => (
																								<SelectItem
																									key={dept}
																									value={dept}
																								>
																									{dept}
																								</SelectItem>
																							),
																						)}
																					</SelectContent>
																				</Select>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="subDepartment"
																		render={({ field }) => {
																			const dept =
																				watchedAssignToDepartment ||
																				form.watch("businessUnit");
																			const options = dept
																				? divisionsForDepartment(dept)
																				: USER_DIVISIONS;
																			return (
																				<FormItem>
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Division{" "}
																						<span className="text-red">*</span>
																					</FormLabel>
																					<Select
																						onValueChange={field.onChange}
																						value={field.value || undefined}
																						disabled={options.length === 0}
																					>
																						<FormControl>
																							<SelectTrigger className="bg-white border-slate-300">
																								<SelectValue
																									placeholder={
																										options.length === 0
																											? "Select department first"
																											: "Select sub-department"
																									}
																								/>
																							</SelectTrigger>
																						</FormControl>
																						<SelectContent>
																							{options.map((div) => (
																								<SelectItem
																									key={div}
																									value={div}
																								>
																									{formatDivisionName(div)}
																								</SelectItem>
																							))}
																						</SelectContent>
																					</Select>
																					<FormMessage />
																				</FormItem>
																			);
																		}}
																	/>

																	<FormField
																		control={form.control}
																		name="departmentOwner"
																		render={({ field }) => {
																			const owners =
																				filteredManagers.length > 0
																					? filteredManagers
																					: availableManagers;
																			return (
																				<FormItem>
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Department Owner
																					</FormLabel>
																					<Select
																						onValueChange={field.onChange}
																						value={field.value || undefined}
																						disabled={owners.length === 0}
																					>
																						<FormControl>
																							<SelectTrigger className="bg-white border-slate-300">
																								<SelectValue
																									placeholder={
																										owners.length === 0
																											? "No department managers found"
																											: "Select department manager"
																									}
																								/>
																							</SelectTrigger>
																						</FormControl>
																						<SelectContent>
																							{owners.map((user) => (
																								<SelectItem
																									key={user.$id}
																									value={user.$id}
																								>
																									{user.fullName}
																									{user.email
																										? ` (${user.email})`
																										: ""}
																								</SelectItem>
																							))}
																						</SelectContent>
																					</Select>
																					<FormMessage />
																				</FormItem>
																			);
																		}}
																	/>
																</div>

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="startDate"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Start Date
																				</FormLabel>
																				<FormControl>
																					<WizardDateButton
																						value={field.value}
																						onChange={field.onChange}
																						placeholder="Select start date"
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
																					<WizardDateButton
																						value={field.value}
																						onChange={field.onChange}
																						placeholder="Select execution date"
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
																					<WizardDateButton
																						value={field.value}
																						onChange={field.onChange}
																						placeholder="Select expiry date"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="space-y-4">
																	<div className="flex flex-wrap items-end justify-between gap-4">
																		<FormField
																			control={form.control}
																			name="autoRenew"
																			render={({ field }) => (
																				<FormItem className="space-y-2 shrink-0">
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
																				<FormItem className="w-[140px] shrink-0">
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Renewal Notice (Days)
																					</FormLabel>
																					<Select
																						onValueChange={field.onChange}
																						value={field.value || undefined}
																					>
																						<FormControl>
																							<SelectTrigger className="bg-white border-slate-300 w-[140px]">
																								<SelectValue placeholder="Days" />
																							</SelectTrigger>
																						</FormControl>
																						<SelectContent>
																							{NOTICE_DAY_OPTIONS.map(
																								(days) => (
																									<SelectItem
																										key={days}
																										value={days}
																									>
																										{days} days
																									</SelectItem>
																								),
																							)}
																						</SelectContent>
																					</Select>
																					<FormMessage />
																				</FormItem>
																			)}
																		/>
																	</div>

																	<div className="border-t border-slate-200" />

																	<FormField
																		control={form.control}
																		name="description"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="shad-form-label">
																					Summary / Scope
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						placeholder="Summarize the work, deliverables, or obligations captured in this agreement"
																						rows={6}
																						maxLength={1000}
																						{...field}
																						className="min-h-[140px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<p className="mt-1 text-xs text-slate-500">
																					{field.value?.length ?? 0}/1000
																					characters
																				</p>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>
															</div>
														)}

														{/* Step 3: Parties & Key Contacts */}
														{!isDigitalSignaturesStep && currentStep === 3 && (
															<div className="space-y-4">
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																					value={field.value}
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
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																<div className="grid grid-cols-1 gap-y-3.5">
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

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="primaryInternalContactId"
																		render={({ field }) => {
																			const contacts =
																				filteredManagers.length > 0
																					? filteredManagers
																					: availableManagers;
																			return (
																				<FormItem>
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Primary Internal Contact
																					</FormLabel>
																					<Select
																						onValueChange={field.onChange}
																						value={field.value || undefined}
																						disabled={contacts.length === 0}
																					>
																						<FormControl>
																							<SelectTrigger className="bg-white border-slate-300">
																								<SelectValue placeholder="Select contact" />
																							</SelectTrigger>
																						</FormControl>
																						<SelectContent>
																							{contacts.map((user) => (
																								<SelectItem
																									key={user.$id}
																									value={user.$id}
																								>
																									{user.fullName}
																									{user.email
																										? ` (${user.email})`
																										: ""}
																								</SelectItem>
																							))}
																						</SelectContent>
																					</Select>
																					<FormMessage />
																				</FormItem>
																			);
																		}}
																	/>

																	<FormField
																		control={form.control}
																		name="secondaryInternalContactId"
																		render={({ field }) => {
																			const contacts =
																				filteredManagers.length > 0
																					? filteredManagers
																					: availableManagers;
																			return (
																				<FormItem>
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Secondary Internal Contact
																					</FormLabel>
																					<Select
																						onValueChange={field.onChange}
																						value={field.value || undefined}
																						disabled={contacts.length === 0}
																					>
																						<FormControl>
																							<SelectTrigger className="bg-white border-slate-300">
																								<SelectValue placeholder="Select contact" />
																							</SelectTrigger>
																						</FormControl>
																						<SelectContent>
																							{contacts.map((user) => (
																								<SelectItem
																									key={user.$id}
																									value={user.$id}
																								>
																									{user.fullName}
																									{user.email
																										? ` (${user.email})`
																										: ""}
																								</SelectItem>
																							))}
																						</SelectContent>
																					</Select>
																					<FormMessage />
																				</FormItem>
																			);
																		}}
																	/>
																</div>
															</div>
														)}

														{/* Step 4: Financials & Payment Terms */}
														{!isDigitalSignaturesStep && currentStep === 4 && (
															<div className="space-y-4">
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																					<CurrencyAmountInput
																						symbol={currencySymbol(
																							form.watch("currencyCode"),
																						)}
																						placeholder="50,000"
																						value={field.value}
																						onChange={field.onChange}
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
																				<CurrencySelect
																					value={field.value}
																					onValueChange={field.onChange}
																					amount={form.watch("amount")}
																				/>
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
																					<CurrencyAmountInput
																						symbol={currencySymbol(
																							form.watch("currencyCode"),
																						)}
																						placeholder="100,000 cap"
																						value={field.value}
																						onChange={field.onChange}
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
																					value={field.value}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select terms" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{PAYMENT_TERM_OPTIONS.map(
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
																		name="paymentSchedule"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Payment Schedule
																				</FormLabel>
																				<Select
																					onValueChange={field.onChange}
																					value={field.value}
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

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
														{!isDigitalSignaturesStep && currentStep === 5 && (
															<div className="space-y-4">
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																					value={field.value}
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

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="dataPrivacyRequirements"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="shad-form-label">
																					Data Privacy Requirements
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="List HIPAA, PHI, GDPR or other data clauses"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="regulatoryRequirements"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="shad-form-label">
																					Regulatory Requirements
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="DCF, Thriving Mind, CMS or other regulators"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="keyObligations"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Key Obligations (one per line)
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={4}
																						placeholder="Enter obligations separated by newline or comma"
																						{...field}
																						className="min-h-[100px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="serviceLevelAgreements"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Service Level Agreements
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={4}
																						placeholder="Document uptime, response or care metrics"
																						{...field}
																						className="min-h-[100px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="performanceMetrics"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Performance Metrics
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="KPIs or benchmarks"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="reportingRequirements"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Reporting Requirements
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="Monthly metrics, fiscal or progress reports"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="terminationNoticeDays"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Termination Notice (Days)
																				</FormLabel>
																				<Select
																					onValueChange={field.onChange}
																					value={field.value || undefined}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select days" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{NOTICE_DAY_OPTIONS.map((days) => (
																							<SelectItem
																								key={days}
																								value={days}
																							>
																								{days} days
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
																		name="terminationRights"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Termination Rights
																				</FormLabel>
																				<Select
																					onValueChange={field.onChange}
																					value={field.value || undefined}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select rights" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{TERMINATION_RIGHTS_OPTIONS.map(
																							(opt) => (
																								<SelectItem
																									key={opt.value}
																									value={opt.value}
																								>
																									{opt.label}
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
																		name="curePeriodDays"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Cure Period (Days)
																				</FormLabel>
																				<Select
																					onValueChange={field.onChange}
																					value={field.value || undefined}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select days" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{CURE_PERIOD_OPTIONS.map((days) => (
																							<SelectItem
																								key={days}
																								value={days}
																							>
																								{days} days
																							</SelectItem>
																						))}
																					</SelectContent>
																				</Select>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="milestones"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Key Milestones
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="Add one milestone per line"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="deliverables"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Deliverables
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="List deliverables per line"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="slaPenalties"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					SLA Penalties
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="Describe penalties or service credits"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="serviceCreditTerms"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Service Credit Terms
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="Reference how credits are calculated"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="escalationProcedures"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Escalation Procedures
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="Detail escalation flow or SLAs"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="w-full">
																	<FormField
																		control={form.control}
																		name="obligationOwners"
																		render={({ field }) => (
																			<FormItem className="w-full">
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Obligation Owners
																				</FormLabel>
																				<FormControl>
																					<Textarea
																						rows={3}
																						placeholder="List owners separated by newline"
																						{...field}
																						className="min-h-[80px] w-full bg-white border-slate-300 resize-y"
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
														{!isDigitalSignaturesStep && currentStep === 6 && (
															<div className="space-y-4">
																<FormField
																	control={form.control}
																	name="assignedManagers"
																	render={({ field }) => (
																		<FormItem>
																			<FormLabel className="shad-form-label">
																				Assigned To{" "}
																				<span className="text-red">*</span>
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
																									setSelectedManagers(
																										newSelection,
																									);
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
																															id !==
																															manager.$id,
																													)
																												: [
																														...selectedManagers,
																														manager.$id,
																													];
																										setSelectedManagers(
																											newSelection,
																										);
																										field.onChange(
																											newSelection,
																										);
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
																							{assigneeFallbackMessage(
																								assigneeSource,
																							) ||
																								"No managers in this department yet. You will be assigned as the default owner."}
																						</p>
																					) : (
																						<p className="text-sm text-slate-500 p-2">
																							Select a department and division
																							to load assignees
																						</p>
																					)}
																				</div>
																				{assigneeFallbackMessage(
																					assigneeSource,
																					filteredManagers.find(
																						(m) =>
																							m.$id === selectedManagers[0],
																					)?.fullName,
																				) ? (
																					<p className="text-xs text-slate-600">
																						{assigneeFallbackMessage(
																							assigneeSource,
																							filteredManagers.find(
																								(m) =>
																									m.$id === selectedManagers[0],
																							)?.fullName,
																						)}
																					</p>
																				) : null}
																				{selectedManagers.length > 0 && (
																					<div className="text-xs text-slate-600">
																						Selected: {selectedManagers.length}{" "}
																						manager(s)
																					</div>
																				)}
																			</div>
																			{filteredManagers.length > 0 ? (
																				<FormMessage />
																			) : null}
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
																															id !==
																															manager.$id,
																													)
																												: [
																														...selectedApprovers,
																														manager.$id,
																													];
																										setSelectedApprovers(
																											newSelection,
																										);
																										field.onChange(
																											newSelection,
																										);
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

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
														{!isDigitalSignaturesStep && currentStep === 7 && (
															<div className="space-y-4">
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="alertRecipientIds"
																		render={({ field }) => {
																			const contacts =
																				filteredManagers.length > 0
																					? filteredManagers
																					: availableManagers;
																			const selected = (field.value || "")
																				.split(/[,\n]/)
																				.map((s: string) => s.trim())
																				.filter(Boolean);
																			return (
																				<FormItem>
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Alert Recipients
																					</FormLabel>
																					<div className="max-h-40 overflow-y-auto space-y-2 rounded-md border border-slate-200 bg-white p-3">
																						{contacts.length === 0 ? (
																							<p className="text-xs text-slate-500">
																								No department managers available
																							</p>
																						) : (
																							contacts.map((user) => {
																								const checked =
																									selected.includes(user.$id);
																								return (
																									<label
																										key={user.$id}
																										className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
																									>
																										<input
																											type="checkbox"
																											className="rounded border-slate-300"
																											checked={checked}
																											onChange={() => {
																												const next = checked
																													? selected.filter(
																															(id) =>
																																id !== user.$id,
																														)
																													: [
																															...selected,
																															user.$id,
																														];
																												field.onChange(
																													next.join(","),
																												);
																											}}
																										/>
																										<span>
																											{user.fullName}
																											{user.email
																												? ` (${user.email})`
																												: ""}
																										</span>
																									</label>
																								);
																							})
																						)}
																					</div>
																					<FormMessage />
																				</FormItem>
																			);
																		}}
																	/>

																	<FormField
																		control={form.control}
																		name="alertEscalationContactIds"
																		render={({ field }) => {
																			const contacts =
																				filteredManagers.length > 0
																					? filteredManagers
																					: availableManagers;
																			const selected = (field.value || "")
																				.split(/[,\n]/)
																				.map((s: string) => s.trim())
																				.filter(Boolean);
																			return (
																				<FormItem>
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Escalation Contacts
																					</FormLabel>
																					<div className="max-h-40 overflow-y-auto space-y-2 rounded-md border border-slate-200 bg-white p-3">
																						{contacts.length === 0 ? (
																							<p className="text-xs text-slate-500">
																								No department managers available
																							</p>
																						) : (
																							contacts.map((user) => {
																								const checked =
																									selected.includes(user.$id);
																								return (
																									<label
																										key={user.$id}
																										className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
																									>
																										<input
																											type="checkbox"
																											className="rounded border-slate-300"
																											checked={checked}
																											onChange={() => {
																												const next = checked
																													? selected.filter(
																															(id) =>
																																id !== user.$id,
																														)
																													: [
																															...selected,
																															user.$id,
																														];
																												field.onChange(
																													next.join(","),
																												);
																											}}
																										/>
																										<span>
																											{user.fullName}
																											{user.email
																												? ` (${user.email})`
																												: ""}
																										</span>
																									</label>
																								);
																							})
																						)}
																					</div>
																					<FormMessage />
																				</FormItem>
																			);
																		}}
																	/>
																</div>

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="alertLeadTimes"
																		render={() => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Alert Lead Times (days)
																				</FormLabel>
																				<FormControl>
																					<Input
																						readOnly
																						value={formatAlertLeadTimesLabel(
																							watchedRenewalNoticeDays,
																						)}
																						className="bg-slate-100 border-slate-300 text-slate-700 cursor-default"
																					/>
																				</FormControl>
																				<p className="text-xs text-slate-500 mt-1">
																					Auto-set from Renewal Notice (Days) on
																					Step 2, plus urgent reminders at 15,
																					10, 5, and 1 days.
																				</p>
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
																				<Select
																					onValueChange={field.onChange}
																					value={field.value || undefined}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select channels" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{ALERT_CHANNEL_OPTIONS.map(
																							(opt) => (
																								<SelectItem
																									key={opt.value}
																									value={opt.value}
																								>
																									{opt.label}
																								</SelectItem>
																							),
																						)}
																					</SelectContent>
																				</Select>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>

																	{/* Alert Strategy — hidden until strategies are wired; default remains "standard" */}
																	{false && (
																		<FormField
																			control={form.control}
																			name="alertStrategy"
																			render={({ field }) => (
																				<FormItem>
																					<FormLabel className="text-sm text-slate-700 mb-1 block">
																						Alert Strategy
																					</FormLabel>
																					<Select
																						onValueChange={field.onChange}
																						value={field.value || undefined}
																					>
																						<FormControl>
																							<SelectTrigger className="bg-white border-slate-300">
																								<SelectValue placeholder="Select strategy" />
																							</SelectTrigger>
																						</FormControl>
																						<SelectContent>
																							{ALERT_STRATEGY_OPTIONS.map(
																								(opt) => (
																									<SelectItem
																										key={opt.value}
																										value={opt.value}
																									>
																										{opt.label}
																									</SelectItem>
																								),
																							)}
																						</SelectContent>
																					</Select>
																					<FormMessage />
																				</FormItem>
																			)}
																		/>
																	)}
																</div>
																<div className="grid grid-cols-1 gap-y-3.5">
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
																</div>
															</div>
														)}

														{/* Step 8: Documents, Attachments & Metadata */}
														{!isDigitalSignaturesStep && currentStep === 8 && (
															<div className="space-y-4">
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																<div className="grid grid-cols-1 gap-y-3.5">
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
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
														{!isDigitalSignaturesStep && currentStep === 9 && (
															<div className="space-y-4">
																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
																	<FormField
																		control={form.control}
																		name="governingLaw"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Governing Law
																				</FormLabel>
																				<Select
																					onValueChange={field.onChange}
																					value={field.value || undefined}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select governing law" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{GOVERNING_LAW_OPTIONS.map(
																							(law) => (
																								<SelectItem
																									key={law}
																									value={law}
																								>
																									{law}
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
																		name="jurisdiction"
																		render={({ field }) => (
																			<FormItem>
																				<FormLabel className="text-sm text-slate-700 mb-1 block">
																					Venue / Jurisdiction
																				</FormLabel>
																				<Select
																					onValueChange={field.onChange}
																					value={field.value || undefined}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select venue" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{JURISDICTION_OPTIONS.map(
																							(venue) => (
																								<SelectItem
																									key={venue}
																									value={venue}
																								>
																									{venue}
																								</SelectItem>
																							),
																						)}
																					</SelectContent>
																				</Select>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>

																<div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
																					value={field.value}
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
																					value={field.value}
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
																				<Select
																					onValueChange={field.onChange}
																					value={field.value || undefined}
																				>
																					<FormControl>
																						<SelectTrigger className="bg-white border-slate-300">
																							<SelectValue placeholder="Select retention period" />
																						</SelectTrigger>
																					</FormControl>
																					<SelectContent>
																						{RETENTION_MONTH_OPTIONS.map(
																							(opt) => (
																								<SelectItem
																									key={opt.value}
																									value={opt.value}
																								>
																									{opt.label}
																								</SelectItem>
																							),
																						)}
																					</SelectContent>
																				</Select>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</div>
															</div>
														)}

														{/* Digital Signatures */}
														{isDigitalSignaturesStep && (
															<div className="space-y-4">
																<div className="space-y-3">
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
																				<p className="text-xs text-slate-500">
																					Turn this on if the document needs a
																					signature. You will add signers later
																					in Execute.
																				</p>
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

											{/* Final step: Review before upload */}
											{isReviewStep && (
												<div className="">
													<div className="mb-4">
														<h3 className="text-lg font-semibold text-slate-700">
															{currentStep}. Review
														</h3>
													</div>
													<ContractReviewStep
														values={form.watch() as Record<string, unknown>}
														fileName={processedFileData?.name}
														contentStepTitles={contentStepTitles}
														lowConfidenceFields={lowConfidenceFields}
														onEditStep={goToStep}
														canPreviewFile={Boolean(
															processedFileData &&
																(Boolean(fileBytesRef.current?.byteLength) ||
																	Boolean(
																		toArrayBuffer(
																			processedFileData.arrayBuffer,
																		),
																	) ||
																	Boolean(processedFileData.base64Content) ||
																	Boolean(processedFileData.bucketFileId)),
														)}
														onPreviewFile={() => {
															void openPdfPreview();
														}}
													/>
												</div>
											)}

											{/* Save and Resume Later */}
											{processedFileData &&
												currentStep > 1 &&
												!isReviewStep && (
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
									</CaalmFilledProvider>
								</Form>
							</div>

							{/* Sticky Footer with Navigation and Action Buttons */}
							<div className="sticky bottom-0 z-10 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
								<div className="flex items-center justify-between">
									{/* Previous/Back Button */}
									<div className="flex items-center space-x-3">
										<Button
											type="button"
											variant="ghost"
											onClick={handleCancelClick}
											disabled={isUploading}
											className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
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
													isUploading ||
													(currentStep === 1 &&
														(!processedFileData ||
															fileIngestUi === "progress" ||
															isExtracting))
												}
												className="btn-primary sm:px-4 px-3"
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
												className="btn-primary min-w-[120px]"
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
			</Dialog>

			<ConfirmDialog
				open={cancelDialogOpen}
				onOpenChange={setCancelDialogOpen}
				icon={<Ban className="h-5 w-5" />}
				title="Cancel Form?"
				description="Your progress will not be saved"
				helperText={
					<p className="text-sm text-slate-700 leading-relaxed">
						Are you sure you want to cancel? If you cancel, the form will not be
						saved and all progress will be lost. You can save your progress
						using the &quot;Save Progress&quot; button before canceling.
					</p>
				}
				cancelLabel="Continue Editing"
				confirmLabel="Cancel & Discard"
				confirmIcon={<Ban className="h-4 w-4" />}
				onConfirm={handleCancelConfirm}
			/>

			<LocalPdfPreviewDialog
				open={pdfPreviewOpen}
				onOpenChange={(open) => {
					if (!open) closePdfPreview();
					else setPdfPreviewOpen(true);
				}}
				fileName={processedFileData?.name || "Contract document"}
				pdfUrl={pdfPreviewUrl}
				htmlContent={previewHtml}
				textContent={previewText}
				downloadOnly={previewDownloadOnly}
				onDownload={downloadLoadedFile}
			/>
		</>
	);
};

export default ContractUploadForm;
