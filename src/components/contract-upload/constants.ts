/**
 * Constants for Contract Upload Form
 */

import { CONTRACT_TYPE_CONFIGS } from "@/lib/contracts/contractTypeConfigs";

// Legacy + document-classification labels used by the step-2 Contract Type select
export const LEGACY_CONTRACT_TYPES = [
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

// Wizard labels + legacy document types (deduped) for filters and selects
export const CONTRACT_TYPES = Array.from(
	new Set([
		...CONTRACT_TYPE_CONFIGS.map((config) => config.label),
		...LEGACY_CONTRACT_TYPES,
	]),
);
export const CONTRACT_CATEGORY_OPTIONS = [
	{ value: "service_agreement", label: "Service Agreement" },
	{ value: "professional_services", label: "Professional Services" },
	{ value: "purchase_agreement", label: "Purchase Agreement" },
	{ value: "lease_agreement", label: "Lease Agreement" },
	{ value: "license_agreement", label: "License Agreement" },
	{ value: "employment_contract", label: "Employment Contract" },
	{ value: "confidentiality_nda", label: "Confidentiality / NDA" },
	{ value: "master_agreement", label: "Master Agreement" },
	{ value: "statement_of_work", label: "Statement of Work (SOW)" },
	{ value: "government_grant", label: "Government Grant" },
	{ value: "government_contract", label: "Government Contract" },
	{ value: "grant_agreement", label: "Grant Agreement" },
	{ value: "amendment", label: "Amendment" },
];

export const LIFECYCLE_STATUSES = [
	{ value: "draft", label: "Draft" },
	{ value: "under_review", label: "Under Review" },
	{ value: "approved", label: "Approved" },
	{ value: "active", label: "Active" },
	{ value: "expired", label: "Expired" },
	{ value: "terminated", label: "Terminated" },
	{ value: "on_hold", label: "On Hold" },
];

export const RISK_LEVELS = [
	{ value: "critical", label: "Critical" },
	{ value: "high", label: "High" },
	{ value: "medium", label: "Medium" },
	{ value: "low", label: "Low" },
];

export const CURRENCY_CODES = [
	"USD",
	"EUR",
	"GBP",
	"CAD",
	"MXN",
	"JPY",
	"AUD",
	"other",
];

export const PAYMENT_TERM_OPTIONS = [
	{ value: "due_on_receipt", label: "Due on Receipt" },
	{ value: "net_15", label: "Net 15" },
	{ value: "net_30", label: "Net 30" },
	{ value: "net_45", label: "Net 45" },
	{ value: "net_60", label: "Net 60" },
	{ value: "net_90", label: "Net 90" },
	{ value: "custom", label: "Custom" },
];

export const PAYMENT_SCHEDULE_OPTIONS = [
	{ value: "one_time", label: "One-time" },
	{ value: "per_service", label: "Per Service" },
	{ value: "monthly", label: "Monthly" },
	{ value: "quarterly", label: "Quarterly" },
	{ value: "annually", label: "Annually" },
	{ value: "milestone", label: "Milestone-based" },
	{ value: "other", label: "Other" },
];

export const COUNTERPARTY_TYPES = [
	{ value: "individual", label: "Individual" },
	{ value: "corporation", label: "Corporation" },
	{ value: "llc", label: "LLC" },
	{ value: "government", label: "Government Entity" },
	{ value: "nonprofit", label: "Nonprofit" },
	{ value: "partnership", label: "Partnership" },
	{ value: "other", label: "Other" },
];

export const ALERT_TIMING_OPTIONS = [
	{ value: "none", label: "No Alerts" },
	{ value: "30_days", label: "30 Days" },
	{ value: "60_days", label: "60 Days" },
	{ value: "90_days", label: "90 Days" },
	{ value: "custom", label: "Custom" },
];

export const DISPUTE_METHOD_OPTIONS = [
	"litigation",
	"arbitration",
	"mediation",
	"negotiation",
	"hybrid",
	"other",
];

export const CONFIDENTIALITY_CLASSES = [
	"public",
	"internal",
	"confidential",
	"restricted",
];

export const SIGNATURE_STATUS_OPTIONS = [
	"not_started",
	"pending",
	"completed",
	"declined",
	"expired",
];

export const ACCESS_SCOPE_OPTIONS = [
	"organization",
	"department",
	"restricted",
];

export const STEP_TITLES = [
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

export const TOTAL_STEPS = 10;
