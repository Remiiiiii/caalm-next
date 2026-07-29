/**
 * Constants for License Upload Form
 */

export const LICENSE_TYPES = [
	"perpetual",
	"subscription",
	"concurrent",
	"named_user",
	"certificate",
	"coi",
	"purchase_order",
	"facility_operating",
	"professional",
	"regulatory",
	"operating_permit",
];

export const CATEGORIES = [
	"saas",
	"on_premise",
	"cloud",
	"certificate",
	"insurance",
	"other",
];

export const COMPLIANCE_STATUSES = [
	{ value: "compliant", label: "Compliant" },
	{ value: "non-compliant", label: "Non-compliant" },
	{ value: "at-risk", label: "At risk" },
	{ value: "action-required", label: "Action required" },
] as const;

export const STEP_TITLES = ["Upload File", "License Details", "Review"];

export const TOTAL_STEPS = 3;
