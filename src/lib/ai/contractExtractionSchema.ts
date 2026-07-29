import { z } from "zod";
import { extractJsonObjectFromModelText } from "./contractTypeSuggestionSchema";

export const CONTRACT_EXTRACTION_METHOD = {
	gemini: "gemini-structured",
	test: "test-extraction",
} as const;

export type ContractExtractionMethod =
	(typeof CONTRACT_EXTRACTION_METHOD)[keyof typeof CONTRACT_EXTRACTION_METHOD];

/** Fields the form can auto-fill from structured extraction. */
export const EXTRACTABLE_CONTRACT_FIELDS = [
	"contractName",
	"contractNumber",
	"description",
	"assignToDepartment",
	"lifecycleStatus",
	"startDate",
	"executionDate",
	"expiryDate",
	"autoRenew",
	"renewalNoticeDays",
	"amount",
	"currencyCode",
	"notToExceedAmount",
	"paymentTerms",
	"paymentSchedule",
	"budgetCode",
	"costCenter",
	"riskLevel",
	"counterpartyLegalName",
	"counterpartyType",
	"counterpartyContactName",
	"counterpartyContactTitle",
	"counterpartyContactEmail",
	"counterpartyContactPhone",
	"counterpartyAddress",
	"counterpartyTaxId",
	"counterpartyDunsNumber",
	"insuranceRequired",
	"insuranceCoveragePerIncident",
	"insuranceCoverageAggregate",
	"indemnificationIncluded",
	"hipaaRequired",
	"dataPrivacyRequirements",
	"backgroundCheckRequired",
	"regulatoryRequirements",
	"auditRightsGranted",
	"keyObligations",
	"serviceLevelAgreements",
	"performanceMetrics",
	"reportingRequirements",
	"terminationNoticeDays",
	"terminationRights",
	"curePeriodDays",
	"riskMitigationPlan",
	"milestones",
	"deliverables",
	"approvalWorkflowTemplate",
	"currentApprovalStage",
	"reviewerComments",
	"governingLaw",
	"jurisdiction",
	"disputeResolutionMethod",
	"projectDescription",
	"attachmentReferences",
] as const;

export type ExtractableContractField =
	(typeof EXTRACTABLE_CONTRACT_FIELDS)[number];

const optionalString = z
	.union([z.string(), z.number(), z.null()])
	.optional()
	.transform((v) => {
		if (v === undefined || v === null) return undefined;
		const s = String(v).trim();
		return s.length ? s : undefined;
	});

const optionalBool = z
	.union([z.boolean(), z.string(), z.null()])
	.optional()
	.transform((v) => {
		if (v === undefined || v === null) return undefined;
		if (typeof v === "boolean") return v;
		const s = v.trim().toLowerCase();
		if (["true", "yes", "y", "1"].includes(s)) return true;
		if (["false", "no", "n", "0"].includes(s)) return false;
		return undefined;
	});

const optionalConfidence = z.coerce.number().min(0).max(1).optional();

const rawExtractionSchema = z
	.object({
		contractName: optionalString,
		contractNumber: optionalString,
		description: optionalString,
		assignToDepartment: optionalString,
		lifecycleStatus: optionalString,
		startDate: optionalString,
		executionDate: optionalString,
		expiryDate: optionalString,
		autoRenew: optionalBool,
		renewalNoticeDays: optionalString,
		amount: optionalString,
		currencyCode: optionalString,
		notToExceedAmount: optionalString,
		paymentTerms: optionalString,
		paymentSchedule: optionalString,
		budgetCode: optionalString,
		costCenter: optionalString,
		riskLevel: optionalString,
		counterpartyLegalName: optionalString,
		/** Legacy / alias — normalized onto counterpartyLegalName */
		vendor: optionalString,
		counterpartyType: optionalString,
		counterpartyContactName: optionalString,
		counterpartyContactTitle: optionalString,
		counterpartyContactEmail: optionalString,
		counterpartyContactPhone: optionalString,
		counterpartyAddress: optionalString,
		counterpartyTaxId: optionalString,
		counterpartyDunsNumber: optionalString,
		insuranceRequired: optionalBool,
		insuranceCoveragePerIncident: optionalString,
		insuranceCoverageAggregate: optionalString,
		indemnificationIncluded: optionalBool,
		hipaaRequired: optionalBool,
		dataPrivacyRequirements: optionalString,
		backgroundCheckRequired: optionalBool,
		regulatoryRequirements: optionalString,
		auditRightsGranted: optionalBool,
		keyObligations: optionalString,
		serviceLevelAgreements: optionalString,
		performanceMetrics: optionalString,
		reportingRequirements: optionalString,
		terminationNoticeDays: optionalString,
		terminationRights: optionalString,
		curePeriodDays: optionalString,
		riskMitigationPlan: optionalString,
		milestones: optionalString,
		deliverables: optionalString,
		approvalWorkflowTemplate: optionalString,
		currentApprovalStage: optionalString,
		reviewerComments: optionalString,
		governingLaw: optionalString,
		jurisdiction: optionalString,
		disputeResolutionMethod: optionalString,
		projectDescription: optionalString,
		attachmentReferences: optionalString,
		overallConfidence: optionalConfidence,
		fieldConfidence: z.record(z.string(), z.coerce.number()).optional(),
	})
	.passthrough();

export type ParsedContractExtraction = {
	fields: Partial<Record<ExtractableContractField, string | boolean>>;
	overallConfidence: number;
	fieldConfidence: Partial<Record<ExtractableContractField, number>>;
	filledFieldNames: ExtractableContractField[];
	lowConfidenceFields: ExtractableContractField[];
};

const LIFECYCLE_MAP: Record<string, string> = {
	draft: "draft",
	"under review": "under_review",
	under_review: "under_review",
	underreview: "under_review",
	approved: "approved",
	active: "active",
	expired: "expired",
	terminated: "terminated",
	"on hold": "on_hold",
	on_hold: "on_hold",
	onhold: "on_hold",
};

const RISK_MAP: Record<string, string> = {
	critical: "critical",
	high: "high",
	"high risk": "high",
	medium: "medium",
	moderate: "medium",
	low: "low",
};

const PAYMENT_TERMS_MAP: Record<string, string> = {
	"due on receipt": "due_on_receipt",
	due_on_receipt: "due_on_receipt",
	"net 15": "net_15",
	net_15: "net_15",
	net15: "net_15",
	"net 30": "net_30",
	net_30: "net_30",
	net30: "net_30",
	"net 45": "net_45",
	net_45: "net_45",
	"net 60": "net_60",
	net_60: "net_60",
	"net 90": "net_90",
	net_90: "net_90",
};

const PAYMENT_SCHEDULE_MAP: Record<string, string> = {
	"one time": "one_time",
	"one-time": "one_time",
	one_time: "one_time",
	"per service": "per_service",
	per_service: "per_service",
	monthly: "monthly",
	quarterly: "quarterly",
	annually: "annually",
	annual: "annually",
	"milestone-based": "milestone",
	milestone: "milestone",
	other: "other",
};

const COUNTERPARTY_TYPE_MAP: Record<string, string> = {
	individual: "individual",
	corporation: "corporation",
	llc: "llc",
	government: "government",
	"government entity": "government",
	nonprofit: "nonprofit",
	"nonprofit corporation": "nonprofit",
	"501(c)(3)": "nonprofit",
	partnership: "partnership",
	other: "other",
};

const DEPARTMENT_MAP: Record<string, string> = {
	it: "IT",
	finance: "Finance",
	administration: "Administration",
	legal: "Legal",
	operations: "Operations",
	sales: "Sales",
	marketing: "Marketing",
	executive: "Executive",
	"executive (contracts office)": "Executive",
	engineering: "Engineering",
};

function compactKey(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapEnum(
	raw: string | undefined,
	map: Record<string, string>,
): string | undefined {
	if (!raw) return undefined;
	const direct = map[raw.trim().toLowerCase()];
	if (direct) return direct;
	const compact = compactKey(raw);
	for (const [k, v] of Object.entries(map)) {
		if (compactKey(k) === compact) return v;
	}
	// Prefer longer key matches (e.g. "nonprofit corporation" over "corporation")
	const entries = Object.entries(map).sort(
		(a, b) => compactKey(b[0]).length - compactKey(a[0]).length,
	);
	for (const [k, v] of entries) {
		const ck = compactKey(k);
		if (ck.length >= 4 && compact.includes(ck)) {
			return v;
		}
	}
	return undefined;
}

/** Normalize money strings to digits suitable for the amount input. */
export function normalizeAmountString(raw: string | undefined): string | undefined {
	if (!raw) return undefined;
	const cleaned = raw.replace(/[^0-9.]/g, "");
	if (!cleaned) return undefined;
	const num = Number(cleaned);
	if (Number.isNaN(num)) return undefined;
	return String(num);
}

/** Prefer YYYY-MM-DD; accept common US date phrases via Date parse. */
export function normalizeDateString(raw: string | undefined): string | undefined {
	if (!raw) return undefined;
	const trimmed = raw.trim();
	const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

	const us = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
	if (us) {
		const m = us[1].padStart(2, "0");
		const d = us[2].padStart(2, "0");
		return `${us[3]}-${m}-${d}`;
	}

	const parsed = new Date(trimmed);
	if (!Number.isNaN(parsed.getTime())) {
		const y = parsed.getFullYear();
		const m = String(parsed.getMonth() + 1).padStart(2, "0");
		const d = String(parsed.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	return undefined;
}

export function parseLocalDateString(dateStr: string): Date | undefined {
	const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
	if (dateOnlyMatch) {
		const [, year, month, day] = dateOnlyMatch;
		return new Date(
			parseInt(year, 10),
			parseInt(month, 10) - 1,
			parseInt(day, 10),
		);
	}
	const d = new Date(dateStr);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

const LOW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Parse Gemini (or fixture) JSON into normalized extractable fields.
 * Maps vendor → counterpartyLegalName and enum aliases onto form values.
 */
export function parseContractExtractionJson(rawJson: string): ParsedContractExtraction {
	let parsed: unknown;
	try {
		parsed = JSON.parse(extractJsonObjectFromModelText(rawJson));
	} catch {
		return {
			fields: {},
			overallConfidence: 0,
			fieldConfidence: {},
			filledFieldNames: [],
			lowConfidenceFields: [],
		};
	}

	const zod = rawExtractionSchema.safeParse(parsed);
	if (!zod.success) {
		return {
			fields: {},
			overallConfidence: 0,
			fieldConfidence: {},
			filledFieldNames: [],
			lowConfidenceFields: [],
		};
	}

	const data = zod.data;
	const fields: ParsedContractExtraction["fields"] = {};

	const counterparty =
		data.counterpartyLegalName || data.vendor || undefined;
	if (counterparty) fields.counterpartyLegalName = counterparty;

	if (data.contractName) fields.contractName = data.contractName;
	if (data.contractNumber) fields.contractNumber = data.contractNumber;
	if (data.description) fields.description = data.description;

	const dept = mapEnum(data.assignToDepartment, DEPARTMENT_MAP);
	if (dept) fields.assignToDepartment = dept;
	else if (data.assignToDepartment) {
		fields.assignToDepartment = data.assignToDepartment;
	}

	const lifecycle = mapEnum(data.lifecycleStatus, LIFECYCLE_MAP);
	if (lifecycle) fields.lifecycleStatus = lifecycle;

	const start = normalizeDateString(data.startDate);
	if (start) fields.startDate = start;
	const execution = normalizeDateString(data.executionDate);
	if (execution) fields.executionDate = execution;
	const expiry = normalizeDateString(data.expiryDate);
	if (expiry) fields.expiryDate = expiry;

	if (data.autoRenew !== undefined) fields.autoRenew = data.autoRenew;
	if (data.renewalNoticeDays) {
		fields.renewalNoticeDays = data.renewalNoticeDays.replace(/[^\d]/g, "");
	}

	const amount = normalizeAmountString(data.amount);
	if (amount) fields.amount = amount;
	const nte = normalizeAmountString(data.notToExceedAmount) || amount;
	if (nte) fields.notToExceedAmount = nte;
	// Prefer NTE as amount when amount omitted (common in grant agreements)
	if (!fields.amount && nte) fields.amount = nte;

	if (data.currencyCode) {
		fields.currencyCode = data.currencyCode.toUpperCase().slice(0, 3);
	}

	const payTerms = mapEnum(data.paymentTerms, PAYMENT_TERMS_MAP);
	if (payTerms) fields.paymentTerms = payTerms;
	const paySched = mapEnum(data.paymentSchedule, PAYMENT_SCHEDULE_MAP);
	if (paySched) fields.paymentSchedule = paySched;

	if (data.budgetCode) fields.budgetCode = data.budgetCode;
	if (data.costCenter) fields.costCenter = data.costCenter;

	const risk = mapEnum(data.riskLevel, RISK_MAP);
	if (risk) fields.riskLevel = risk;

	const cpType = mapEnum(data.counterpartyType, COUNTERPARTY_TYPE_MAP);
	if (cpType) fields.counterpartyType = cpType;

	const stringPassthrough: ExtractableContractField[] = [
		"counterpartyContactName",
		"counterpartyContactTitle",
		"counterpartyContactEmail",
		"counterpartyContactPhone",
		"counterpartyAddress",
		"counterpartyTaxId",
		"counterpartyDunsNumber",
		"insuranceCoveragePerIncident",
		"insuranceCoverageAggregate",
		"dataPrivacyRequirements",
		"regulatoryRequirements",
		"keyObligations",
		"serviceLevelAgreements",
		"performanceMetrics",
		"reportingRequirements",
		"terminationNoticeDays",
		"terminationRights",
		"curePeriodDays",
		"riskMitigationPlan",
		"milestones",
		"deliverables",
		"approvalWorkflowTemplate",
		"currentApprovalStage",
		"reviewerComments",
		"governingLaw",
		"jurisdiction",
		"disputeResolutionMethod",
		"projectDescription",
		"attachmentReferences",
	];

	for (const key of stringPassthrough) {
		const val = data[key as keyof typeof data];
		if (typeof val === "string" && val.trim()) {
			fields[key] = val.trim();
		}
	}

	const boolPassthrough: ExtractableContractField[] = [
		"insuranceRequired",
		"indemnificationIncluded",
		"hipaaRequired",
		"backgroundCheckRequired",
		"auditRightsGranted",
	];
	for (const key of boolPassthrough) {
		const val = data[key as keyof typeof data];
		if (typeof val === "boolean") fields[key] = val;
	}

	const fieldConfidence: ParsedContractExtraction["fieldConfidence"] = {};
	const rawConf = data.fieldConfidence || {};
	for (const key of EXTRACTABLE_CONTRACT_FIELDS) {
		const c = rawConf[key] ?? rawConf[key === "counterpartyLegalName" ? "vendor" : ""];
		if (typeof c === "number" && !Number.isNaN(c)) {
			fieldConfidence[key] = Math.min(1, Math.max(0, c));
		}
	}

	const filledFieldNames = EXTRACTABLE_CONTRACT_FIELDS.filter(
		(k) => fields[k] !== undefined && fields[k] !== "",
	);

	for (const key of filledFieldNames) {
		if (fieldConfidence[key] === undefined) {
			fieldConfidence[key] = data.overallConfidence ?? 0.75;
		}
	}

	const overallConfidence =
		typeof data.overallConfidence === "number"
			? data.overallConfidence
			: filledFieldNames.length
				? filledFieldNames.reduce(
						(sum, k) => sum + (fieldConfidence[k] ?? 0.75),
						0,
					) / filledFieldNames.length
				: 0;

	const lowConfidenceFields = filledFieldNames.filter(
		(k) => (fieldConfidence[k] ?? 0) < LOW_CONFIDENCE_THRESHOLD,
	);

	return {
		fields,
		overallConfidence,
		fieldConfidence,
		filledFieldNames,
		lowConfidenceFields,
	};
}

export type ContractFormExtractionPatch = Record<string, unknown>;

/**
 * Build a react-hook-form patch from parsed extraction (dates as Date objects).
 */
export function buildFormPatchFromExtraction(
	parsed: ParsedContractExtraction,
	fallbackFileName?: string,
): ContractFormExtractionPatch {
	const { fields } = parsed;
	const patch: ContractFormExtractionPatch = {};

	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === "") continue;
		if (
			key === "startDate" ||
			key === "executionDate" ||
			key === "expiryDate"
		) {
			const d = parseLocalDateString(String(value));
			if (d) patch[key] = d;
			continue;
		}
		patch[key] = value;
	}

	if (!patch.contractName && fallbackFileName) {
		patch.contractName = fallbackFileName.replace(/\.[^/.]+$/, "");
	}

	return patch;
}

export function isRealExtractionMethod(
	method: string | undefined | null,
): boolean {
	return method === CONTRACT_EXTRACTION_METHOD.gemini;
}

export const LOW_EXTRACTION_CONFIDENCE = LOW_CONFIDENCE_THRESHOLD;
