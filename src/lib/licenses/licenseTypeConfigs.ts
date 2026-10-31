/**
 * Per-license-type config for the License Upload wizard's type-selection
 * screen and its dynamic steps. Unlike contractTypeConfigs.ts (which only
 * stores field *names* and relies on field metadata hardcoded in
 * ContractUploadForm.tsx), this config is self-contained: every field's
 * label/type/options lives here so DynamicLicenseStep never hardcodes a
 * per-type field list.
 */

import { isDemoMode } from "@/lib/config/demo-mode";

export interface LicenseFieldDef {
	name: string;
	label: string;
	type: "text" | "date" | "select" | "file" | "textarea";
	required: boolean;
	options?: { value: string; label: string }[];
}

export interface LicenseTypeStep {
	title: string;
	description: string;
	fields: LicenseFieldDef[];
	/** "ownership" renders the dedicated division/department/assignee/file-location step. */
	kind?: "dynamic" | "ownership";
}

export interface LicenseChecklistItem {
	label: string;
	/** Feeds a future compliance dashboard; not used by the picker UI itself. */
	critical?: boolean;
}

export interface LicenseTypeConfig {
	id: string;
	label: string;
	description: string;
	icon: string;
	/** Allow-list membership used ONLY while isDemoMode() is true — see isDemoLicenseTypeAllowed. */
	demoAllowed: boolean;
	steps: LicenseTypeStep[];
	checklist: LicenseChecklistItem[];
}

function recordDetailsFields(
	checklist: LicenseChecklistItem[],
	extra: LicenseFieldDef[] = [],
): LicenseFieldDef[] {
	return [
		{
			name: "licenseName",
			label: "Record Name",
			type: "select",
			required: true,
			options: [
				...checklist.map((c) => ({ value: c.label, label: c.label })),
				{ value: "Other", label: "Other" },
			],
		},
		{
			name: "issuingAuthority",
			label: "Issuing Authority",
			type: "text",
			required: true,
		},
		{
			name: "entityCovered",
			label: "Entity Covered",
			type: "select",
			required: false,
			options: [
				{ value: "CFCE", label: "CFCE" },
				{ value: "Affiliate", label: "Affiliate" },
				{ value: "Other", label: "Other" },
			],
		},
		...extra,
	];
}

function identifierFields(extra: LicenseFieldDef[] = []): LicenseFieldDef[] {
	return [
		{
			name: "licenseNumber",
			label: "License / Registration Number",
			type: "text",
			required: false,
		},
		{ name: "issueDate", label: "Issue Date", type: "date", required: false },
		{
			name: "licenseExpiryDate",
			label: "Expiration Date",
			type: "date",
			required: true,
		},
		{
			name: "renewalFrequency",
			label: "Renewal Frequency",
			type: "select",
			required: false,
			options: [
				{ value: "Annual", label: "Annual" },
				{ value: "Biennial", label: "Biennial" },
				{ value: "Every 3 years", label: "Every 3 years" },
				{ value: "Every 5 years", label: "Every 5 years" },
				{ value: "One-time", label: "One-time" },
				{ value: "Other", label: "Other" },
			],
		},
		...extra,
	];
}

function buildSteps(opts: {
	checklist: LicenseChecklistItem[];
	extraRecordFields?: LicenseFieldDef[];
	extraIdentifierFields?: LicenseFieldDef[];
	complianceStep?: LicenseTypeStep;
}): LicenseTypeStep[] {
	const steps: LicenseTypeStep[] = [
		{
			title: "Record Details",
			description: "What this record is and who issued it.",
			fields: recordDetailsFields(opts.checklist, opts.extraRecordFields),
		},
		{
			title: "Identifiers & Dates",
			description: "Numbers, dates, and renewal cadence.",
			fields: identifierFields(opts.extraIdentifierFields),
		},
	];
	if (opts.complianceStep) steps.push(opts.complianceStep);
	steps.push({
		title: "Ownership & Storage",
		description: "Who owns this record and where it's filed.",
		fields: [],
		kind: "ownership",
	});
	return steps;
}

export const LICENSE_TYPE_CONFIGS: LicenseTypeConfig[] = [
	{
		id: "nonprofit-corporate",
		label: "Nonprofit & Corporate",
		description:
			"Articles, IRS 501(c)(3) letter, state registrations, solicitation and tax exemptions",
		icon: "Building2",
		demoAllowed: true,
		checklist: [
			{ label: "Florida nonprofit registration / articles", critical: true },
			{
				label: "IRS 501(c)(3) determination letter and EIN",
				critical: true,
			},
			{ label: "Florida annual report" },
			{ label: "Florida charitable solicitation registration", critical: true },
			{ label: "Foreign-state solicitation registration", critical: true },
			{ label: "Sales-tax exemption certificate" },
			{ label: "Property-tax exemption" },
		],
		steps: buildSteps({
			checklist: [
				{ label: "Florida nonprofit registration / articles", critical: true },
				{
					label: "IRS 501(c)(3) determination letter and EIN",
					critical: true,
				},
				{ label: "Florida annual report" },
				{
					label: "Florida charitable solicitation registration",
					critical: true,
				},
				{ label: "Foreign-state solicitation registration", critical: true },
				{ label: "Sales-tax exemption certificate" },
				{ label: "Property-tax exemption" },
			],
		}),
	},
	{
		id: "child-welfare-foster",
		label: "Child Welfare & Foster Care",
		description:
			"Child-placing credentials, foster-home licensing, group-home approvals",
		icon: "Baby",
		demoAllowed: false,
		checklist: [
			{ label: "Child-placing agency credential/contract" },
			{ label: "Foster-home licensing record", critical: true },
			{ label: "Background screening & fingerprinting", critical: true },
			{ label: "Mandated-reporter training" },
			{ label: "Group-home operating approval" },
			{ label: "Lead-agency contract compliance record", critical: true },
		],
		steps: buildSteps({
			checklist: [
				{ label: "Child-placing agency credential/contract" },
				{ label: "Foster-home licensing record", critical: true },
				{ label: "Background screening & fingerprinting", critical: true },
				{ label: "Mandated-reporter training" },
				{ label: "Group-home operating approval" },
				{ label: "Lead-agency contract compliance record", critical: true },
			],
			complianceStep: {
				title: "Compliance & Contracts",
				description: "Screening and lead-agency contract compliance.",
				fields: [
					{
						name: "backgroundScreeningStatus",
						label: "Background Screening Status",
						type: "select",
						required: false,
						options: [
							{ value: "Completed", label: "Completed" },
							{ value: "Pending", label: "Pending" },
							{ value: "Not Required", label: "Not Required" },
						],
					},
					{
						name: "agencyContractReference",
						label: "Agency / Lead-Agency Contract Reference",
						type: "text",
						required: false,
					},
				],
			},
		}),
	},
	{
		id: "behavioral-health",
		label: "Behavioral Health",
		description:
			"Provider licensure, substance-use programs, case management, HIPAA",
		icon: "Brain",
		demoAllowed: false,
		checklist: [
			{ label: "Behavioral-health provider licensure", critical: true },
			{ label: "Substance-use treatment licensure/certification" },
			{ label: "Targeted case-management documentation" },
			{ label: "HIPAA privacy & security compliance record", critical: true },
		],
		steps: buildSteps({
			checklist: [
				{ label: "Behavioral-health provider licensure", critical: true },
				{ label: "Substance-use treatment licensure/certification" },
				{ label: "Targeted case-management documentation" },
				{
					label: "HIPAA privacy & security compliance record",
					critical: true,
				},
			],
			complianceStep: {
				title: "Compliance & Contracts",
				description: "HIPAA and substance-use program compliance.",
				fields: [
					{
						name: "hipaaComplianceRecord",
						label: "HIPAA Compliance Record Reference",
						type: "text",
						required: false,
					},
					{
						name: "substanceUseCertification",
						label: "Substance-Use Program Certification (if applicable)",
						type: "text",
						required: false,
					},
				],
			},
		}),
	},
	{
		id: "health-center-clinical",
		label: "Health Center & Clinical",
		description: "FQHC/HRSA, clinic licensure, labs, PHS deemed status",
		icon: "Stethoscope",
		demoAllowed: true,
		checklist: [
			{ label: "FQHC designation / HRSA compliance", critical: true },
			{ label: "Florida healthcare-clinic license", critical: true },
			{ label: "Clinical laboratory certification" },
			{ label: "Pharmacy/medication-management record" },
			{ label: "Malpractice / FTCA / PHS deemed-status", critical: true },
			{ label: "Patient-consent & records-retention documentation" },
		],
		steps: buildSteps({
			checklist: [
				{ label: "FQHC designation / HRSA compliance", critical: true },
				{ label: "Florida healthcare-clinic license", critical: true },
				{ label: "Clinical laboratory certification" },
				{ label: "Pharmacy/medication-management record" },
				{ label: "Malpractice / FTCA / PHS deemed-status", critical: true },
				{ label: "Patient-consent & records-retention documentation" },
			],
			complianceStep: {
				title: "Compliance & Contracts",
				description: "HRSA and PHS deemed-status documentation.",
				fields: [
					{
						name: "hrsaComplianceStatus",
						label: "HRSA / FQHC Deemed Status",
						type: "select",
						required: false,
						options: [
							{ value: "Deemed", label: "Deemed" },
							{ value: "Not Deemed", label: "Not Deemed" },
							{ value: "N/A", label: "N/A" },
						],
					},
					{
						name: "phsDeemedStatus",
						label: "PHS Malpractice Coverage",
						type: "select",
						required: false,
						options: [
							{ value: "Yes", label: "Yes" },
							{ value: "No", label: "No" },
							{ value: "N/A", label: "N/A" },
						],
					},
				],
			},
		}),
	},
	{
		id: "dental",
		label: "Dental Services",
		description:
			"Clinic registration, x-ray registration, sterilization records",
		icon: "Smile",
		demoAllowed: false,
		checklist: [
			{ label: "Dental clinic registration/license", critical: true },
			{ label: "Dental radiography/x-ray registration & inspection" },
			{ label: "Sterilization & infection-control record" },
			{ label: "Dental insurance participation agreement" },
		],
		steps: buildSteps({
			checklist: [
				{ label: "Dental clinic registration/license", critical: true },
				{ label: "Dental radiography/x-ray registration & inspection" },
				{ label: "Sterilization & infection-control record" },
				{ label: "Dental insurance participation agreement" },
			],
		}),
	},
	{
		id: "professional-credential",
		label: "Professional License",
		description: "Individual clinician licenses and DEA registrations",
		icon: "BadgeCheck",
		demoAllowed: false,
		checklist: [
			{ label: "Mental-health professional license", critical: true },
			{ label: "Psychiatric provider credential", critical: true },
			{ label: "DEA registration" },
			{ label: "Medical/nursing/allied-health license", critical: true },
			{ label: "Dentist/hygienist license" },
		],
		steps: buildSteps({
			checklist: [
				{ label: "Mental-health professional license", critical: true },
				{ label: "Psychiatric provider credential", critical: true },
				{ label: "DEA registration" },
				{ label: "Medical/nursing/allied-health license", critical: true },
				{ label: "Dentist/hygienist license" },
			],
			extraRecordFields: [
				{
					name: "holderName",
					label: "License Holder Name",
					type: "text",
					required: true,
				},
				{
					name: "holderRole",
					label: "Holder Role / Title",
					type: "text",
					required: false,
				},
				{
					name: "licenseBoard",
					label: "Licensing Board",
					type: "text",
					required: false,
				},
			],
		}),
	},
	{
		id: "facilities-safety",
		label: "Facilities & Safety",
		description: "Business tax receipt, occupancy, fire, permits, inspections",
		icon: "HardHat",
		demoAllowed: false,
		checklist: [
			{ label: "Business tax receipt" },
			{ label: "Certificate of occupancy" },
			{ label: "Fire inspection", critical: true },
			{ label: "Building/renovation/equipment permit" },
			{ label: "Elevator/HVAC/generator/medical-equipment inspection" },
			{ label: "Zoning/land-use approval" },
		],
		steps: buildSteps({
			checklist: [
				{ label: "Business tax receipt" },
				{ label: "Certificate of occupancy" },
				{ label: "Fire inspection", critical: true },
				{ label: "Building/renovation/equipment permit" },
				{ label: "Elevator/HVAC/generator/medical-equipment inspection" },
				{ label: "Zoning/land-use approval" },
			],
		}),
	},
	{
		id: "insurance-risk",
		label: "Insurance & Risk",
		description: "GL, malpractice, D&O, workers' comp, cyber, certificates",
		icon: "ShieldCheck",
		demoAllowed: true,
		checklist: [
			{ label: "General liability", critical: true },
			{ label: "Professional liability/malpractice", critical: true },
			{ label: "D&O" },
			{ label: "Workers' compensation", critical: true },
			{ label: "Commercial auto" },
			{ label: "Cyber liability" },
			{ label: "Contractor/vendor certificates of insurance", critical: true },
		],
		steps: buildSteps({
			checklist: [
				{ label: "General liability", critical: true },
				{ label: "Professional liability/malpractice", critical: true },
				{ label: "D&O" },
				{ label: "Workers' compensation", critical: true },
				{ label: "Commercial auto" },
				{ label: "Cyber liability" },
				{
					label: "Contractor/vendor certificates of insurance",
					critical: true,
				},
			],
			extraIdentifierFields: [
				{
					name: "carrierName",
					label: "Insurance Carrier",
					type: "text",
					required: false,
				},
				{
					name: "policyNumber",
					label: "Policy Number",
					type: "text",
					required: false,
				},
				{
					name: "coverageAmount",
					label: "Coverage Amount",
					type: "text",
					required: false,
				},
				{
					name: "certificateHolder",
					label: "Certificate Holder",
					type: "text",
					required: false,
				},
			],
		}),
	},
	{
		id: "programs-grants",
		label: "Programs, Events & Grants",
		description:
			"Event/raffle permits, grant agreements, food-service, transport",
		icon: "Gift",
		demoAllowed: false,
		checklist: [
			{ label: "Special-event/raffle/gaming permit" },
			{ label: "Grant agreement (HHS/HRSA)", critical: true },
			{ label: "Food-service/food-handler permit" },
			{ label: "Transportation/field-trip permission" },
			{
				label: "Volunteer/intern background-check & child-protection policy",
				critical: true,
			},
		],
		steps: buildSteps({
			checklist: [
				{ label: "Special-event/raffle/gaming permit" },
				{ label: "Grant agreement (HHS/HRSA)", critical: true },
				{ label: "Food-service/food-handler permit" },
				{ label: "Transportation/field-trip permission" },
				{
					label: "Volunteer/intern background-check & child-protection policy",
					critical: true,
				},
			],
		}),
	},
];

export function getLicenseTypeConfig(
	id: string | null | undefined,
): LicenseTypeConfig | undefined {
	if (!id) return undefined;
	return LICENSE_TYPE_CONFIGS.find((c) => c.id === id);
}

export function getLicenseStepFields(
	id: string | null | undefined,
	stepIndex: number,
): LicenseFieldDef[] {
	return getLicenseTypeConfig(id)?.steps[stepIndex]?.fields ?? [];
}

/** Required field names for a dynamic step; the division/department/assignee
 * trio on the ownership step is validated separately (see index.tsx). */
export function getLicenseRequiredFieldsForStep(
	id: string | null | undefined,
	stepIndex: number,
): string[] {
	return getLicenseStepFields(id, stepIndex)
		.filter((f) => f.required)
		.map((f) => f.name);
}

export function getDateFieldNames(id: string | null | undefined): string[] {
	const config = getLicenseTypeConfig(id);
	const dynamic =
		config?.steps.flatMap((s) =>
			s.fields.filter((f) => f.type === "date").map((f) => f.name),
		) ?? [];
	return Array.from(
		new Set(["licenseExpiryDate", "issueDate", "renewalDate", ...dynamic]),
	);
}

/**
 * Mirrors ContractUploadForm.tsx's isDemoContractTypeAllowed: outside demo
 * mode every type is available; the `demoAllowed` allow-list only applies
 * while isDemoMode() is true.
 */
export function isDemoLicenseTypeAllowed(typeId: string): boolean {
	if (!isDemoMode()) return true;
	return getLicenseTypeConfig(typeId)?.demoAllowed ?? false;
}
