/**
 * Contract Type Configuration System
 * Defines contract types, their fields, steps, and validation rules for nonprofit contracts
 */

export interface ContractTypeConfig {
	id: string;
	label: string;
	description: string;
	icon: string; // Lucide icon name
	steps: number;
	stepTitles: string[];
	fieldsByStep: Record<number, string[]>;
	requiredFields: string[];
}

export const CONTRACT_TYPE_CONFIGS: ContractTypeConfig[] = [
	{
		id: "employment",
		label: "Employment Contract",
		description: "Agreements with employees for work and compensation",
		icon: "Briefcase",
		steps: 5,
		stepTitles: [
			"Upload File",
			"Contract Basics",
			"Employee Details",
			"Compensation & Benefits",
			"Legal & Compliance",
		],
		fieldsByStep: {
			1: [], // Upload file step
			2: [
				"contractName",
				"contractType",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"lifecycleStatus",
			],
			3: [
				"counterpartyLegalName", // employee name
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"counterpartyAddress",
				"backgroundCheckRequired",
			],
			4: [
				"amount",
				"currencyCode",
				"paymentSchedule",
				"budgetCode",
				"costCenter",
			],
			5: [
				"governingLaw",
				"jurisdiction",
				"confidentialityClassification",
				"terminationNoticeDays",
				"terminationRights",
			],
		},
		requiredFields: [
			"contractName",
			"contractType",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
		],
	},
	{
		id: "vendor",
		label: "Vendor/Service Agreement",
		description: "Service contracts with vendors and service providers",
		icon: "Package",
		steps: 6,
		stepTitles: [
			"Upload File",
			"Contract Basics",
			"Vendor Information",
			"Service & Performance",
			"Financials",
			"Risk & Insurance",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"autoRenew",
				"lifecycleStatus",
				"description",
			],
			3: [
				"counterpartyLegalName",
				"counterpartyType",
				"counterpartyTaxId",
				"counterpartyDunsNumber",
				"counterpartyContactName",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"counterpartyAddress",
			],
			4: [
				"businessPurpose",
				"serviceLevelAgreements",
				"performanceMetrics",
				"keyObligations",
				"deliverables",
				"milestones",
			],
			5: [
				"amount",
				"currencyCode",
				"notToExceedAmount",
				"paymentTerms",
				"paymentSchedule",
				"budgetCode",
				"projectMatterId",
			],
			6: [
				"riskLevel",
				"insuranceRequired",
				"insuranceCoveragePerIncident",
				"insuranceCoverageAggregate",
				"indemnificationIncluded",
				"terminationRights",
			],
		},
		requiredFields: [
			"contractName",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
			"riskLevel",
		],
	},
	{
		id: "grant",
		label: "Grant Agreement",
		description: "Grant funding agreements with grantors and foundations",
		icon: "Gift",
		steps: 6,
		stepTitles: [
			"Upload File",
			"Grant Basics",
			"Grantor Information",
			"Grant Terms",
			"Performance & Reporting",
			"Compliance & Notifications",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"lifecycleStatus",
				"businessPurpose",
			],
			3: [
				"counterpartyLegalName",
				"counterpartyType",
				"counterpartyContactName",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
			],
			4: [
				"amount",
				"currencyCode",
				"paymentSchedule",
				"budgetCode",
				"notToExceedAmount",
				"costCenter",
				"projectMatterId",
			],
			5: [
				"keyObligations",
				"milestones",
				"deliverables",
				"performanceMetrics",
				"reportingRequirements",
				"auditRightsGranted",
			],
			6: [
				"dataPrivacyRequirements",
				"regulatoryRequirements",
				"alertRecipientIds",
				"alertLeadTimes",
				"governingLaw",
			],
		},
		requiredFields: [
			"contractName",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
		],
	},
	{
		id: "government",
		label: "Government Contract",
		description: "Contracts with government agencies and entities",
		icon: "Building2",
		steps: 7,
		stepTitles: [
			"Upload File",
			"Contract Basics",
			"Government Agency",
			"Contract Terms",
			"Compliance & Regulations",
			"Performance & Deliverables",
			"Risk & Legal",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"lifecycleStatus",
				"description",
			],
			3: [
				"counterpartyLegalName",
				"counterpartyType",
				"counterpartyContactName",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"counterpartyAddress",
			],
			4: [
				"amount",
				"currencyCode",
				"notToExceedAmount",
				"paymentTerms",
				"paymentSchedule",
				"budgetCode",
				"costCenter",
			],
			5: [
				"regulatoryRequirements",
				"dataPrivacyRequirements",
				"hipaaRequired",
				"auditRightsGranted",
				"backgroundCheckRequired",
			],
			6: [
				"keyObligations",
				"serviceLevelAgreements",
				"performanceMetrics",
				"reportingRequirements",
				"milestones",
				"deliverables",
			],
			7: [
				"riskLevel",
				"riskMitigationPlan",
				"governingLaw",
				"jurisdiction",
				"disputeResolutionMethod",
				"terminationRights",
			],
		},
		requiredFields: [
			"contractName",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
			"riskLevel",
		],
	},
	{
		id: "lease",
		label: "Lease Agreement",
		description: "Property and facility lease agreements",
		icon: "Home",
		steps: 5,
		stepTitles: [
			"Upload File",
			"Lease Basics",
			"Property & Landlord",
			"Financial Terms",
			"Terms & Conditions",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"autoRenew",
				"renewalNoticeDays",
				"lifecycleStatus",
			],
			3: [
				"businessPurpose", // property description
				"counterpartyLegalName", // landlord
				"counterpartyContactName",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"counterpartyAddress",
			],
			4: [
				"amount", // rent amount
				"currencyCode",
				"paymentSchedule",
				"paymentTerms",
				"budgetCode",
				"costCenter",
			],
			5: [
				"insuranceRequired",
				"insuranceCoveragePerIncident",
				"indemnificationIncluded",
				"terminationNoticeDays",
				"terminationRights",
				"keyObligations",
			],
		},
		requiredFields: [
			"contractName",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
		],
	},
	{
		id: "consulting",
		label: "Consulting Agreement",
		description: "Professional consulting and advisory services",
		icon: "Users",
		steps: 6,
		stepTitles: [
			"Upload File",
			"Engagement Basics",
			"Consultant Information",
			"Scope of Work",
			"Compensation",
			"Legal & Confidentiality",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"lifecycleStatus",
				"businessPurpose",
			],
			3: [
				"counterpartyLegalName",
				"counterpartyType",
				"counterpartyTaxId",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"counterpartyAddress",
				"backgroundCheckRequired",
			],
			4: [
				"description",
				"keyObligations",
				"deliverables",
				"milestones",
				"performanceMetrics",
				"serviceLevelAgreements",
			],
			5: [
				"amount",
				"currencyCode",
				"paymentSchedule",
				"paymentTerms",
				"budgetCode",
				"projectMatterId",
			],
			6: [
				"confidentialityClassification",
				"indemnificationIncluded",
				"governingLaw",
				"jurisdiction",
				"terminationRights",
				"dataPrivacyRequirements",
			],
		},
		requiredFields: [
			"contractName",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
		],
	},
	{
		id: "mou",
		label: "Memorandum of Understanding",
		description: "Collaborative agreements and partnerships",
		icon: "Handshake",
		steps: 4,
		stepTitles: [
			"Upload File",
			"MOU Basics",
			"Partner Organization",
			"Terms & Obligations",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"lifecycleStatus",
				"businessPurpose",
				"description",
			],
			3: [
				"counterpartyLegalName",
				"counterpartyType",
				"counterpartyContactName",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
			],
			4: [
				"keyObligations",
				"deliverables",
				"milestones",
				"terminationRights",
				"governingLaw",
			],
		},
		requiredFields: [
			"contractName",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
		],
	},
	{
		id: "donation",
		label: "Donation/Gift Agreement",
		description: "Charitable donations and gift arrangements",
		icon: "Heart",
		steps: 4,
		stepTitles: [
			"Upload File",
			"Donation Basics",
			"Donor Information",
			"Gift Terms",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"executionDate",
				"lifecycleStatus",
				"businessPurpose",
			],
			3: [
				"counterpartyLegalName",
				"counterpartyType",
				"counterpartyContactName",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"counterpartyAddress",
			],
			4: [
				"amount",
				"currencyCode",
				"paymentSchedule",
				"budgetCode",
				"projectMatterId",
				"keyObligations", // donor restrictions
			],
		},
		requiredFields: [
			"contractName",
			"assignToDepartment",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
		],
	},
	{
		id: "independent_contractor",
		label: "Independent Contractor Agreement",
		description: "Agreements with independent contractors",
		icon: "UserCheck",
		steps: 6,
		stepTitles: [
			"Upload File",
			"Contract Basics",
			"Contractor Details",
			"Scope & Deliverables",
			"Compensation",
			"Legal Terms",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"lifecycleStatus",
				"businessPurpose",
			],
			3: [
				"counterpartyLegalName",
				"counterpartyTaxId",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"counterpartyAddress",
				"backgroundCheckRequired",
			],
			4: [
				"description",
				"keyObligations",
				"deliverables",
				"milestones",
				"performanceMetrics",
			],
			5: [
				"amount",
				"currencyCode",
				"paymentSchedule",
				"paymentTerms",
				"budgetCode",
			],
			6: [
				"indemnificationIncluded",
				"insuranceRequired",
				"insuranceCoveragePerIncident",
				"confidentialityClassification",
				"terminationRights",
				"governingLaw",
			],
		},
		requiredFields: [
			"contractName",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
		],
	},
	{
		id: "fiscal_sponsorship",
		label: "Fiscal Sponsorship Agreement",
		description: "Fiscal sponsorship for projects and programs",
		icon: "Shield",
		steps: 6,
		stepTitles: [
			"Upload File",
			"Sponsorship Basics",
			"Sponsored Project",
			"Financial Management",
			"Oversight & Compliance",
			"Terms & Termination",
		],
		fieldsByStep: {
			1: [],
			2: [
				"contractName",
				"contractNumber",
				"assignToDepartment",
				"startDate",
				"expiryDate",
				"lifecycleStatus",
				"businessPurpose",
			],
			3: [
				"counterpartyLegalName", // project name
				"counterpartyContactName",
				"counterpartyContactEmail",
				"counterpartyContactPhone",
				"description", // project description
			],
			4: [
				"amount", // initial funding
				"currencyCode",
				"budgetCode",
				"costCenter",
				"projectMatterId",
				"paymentSchedule",
			],
			5: [
				"keyObligations",
				"auditRightsGranted",
				"reportingRequirements",
				"regulatoryRequirements",
				"dataPrivacyRequirements",
			],
			6: [
				"indemnificationIncluded",
				"riskLevel",
				"terminationNoticeDays",
				"terminationRights",
				"governingLaw",
				"alertRecipientIds",
			],
		},
		requiredFields: [
			"contractName",
			"contractNumber",
			"assignToDepartment",
			"expiryDate",
			"counterpartyLegalName",
			"amount",
			"currencyCode",
			"riskLevel",
		],
	},
];

/**
 * Get contract type configuration by ID
 */
export function getContractTypeConfig(
	typeId: string,
): ContractTypeConfig | undefined {
	return CONTRACT_TYPE_CONFIGS.find((config) => config.id === typeId);
}

/**
 * Resolve a contract type ID from a draft payload / formData.
 * Prefers explicit type id, then falls back to the human-readable label.
 */
export function resolveDraftContractTypeId(input: {
	selectedContractType?: string | null;
	formData?: Record<string, unknown> | null;
}): string | null {
	const fromTop =
		typeof input.selectedContractType === "string"
			? input.selectedContractType.trim()
			: "";
	if (fromTop && getContractTypeConfig(fromTop)) return fromTop;

	const formData = input.formData;
	if (!formData || typeof formData !== "object") return null;

	const fromFormId = formData.selectedContractType;
	if (typeof fromFormId === "string" && fromFormId.trim()) {
		const id = fromFormId.trim();
		if (getContractTypeConfig(id)) return id;
	}

	const label = formData.contractType;
	if (typeof label === "string" && label.trim()) {
		const byLabel = CONTRACT_TYPE_CONFIGS.find(
			(config) => config.label.toLowerCase() === label.trim().toLowerCase(),
		);
		if (byLabel) return byLabel.id;
	}

	return null;
}

/**
 * Get fields for a specific step of a contract type
 */
export function getFieldsForStep(
	typeId: string,
	step: number,
): string[] | undefined {
	const config = getContractTypeConfig(typeId);
	return config?.fieldsByStep[step];
}

/**
 * Get required fields for a contract type
 */
export function getRequiredFields(typeId: string): string[] {
	const config = getContractTypeConfig(typeId);
	return config?.requiredFields || [];
}

/**
 * Check if a field is required for a specific contract type
 */
export function isFieldRequired(typeId: string, fieldName: string): boolean {
	const requiredFields = getRequiredFields(typeId);
	return requiredFields.includes(fieldName);
}

/**
 * Get all contract type IDs
 */
export function getAllContractTypeIds(): string[] {
	return CONTRACT_TYPE_CONFIGS.map((config) => config.id);
}

/**
 * Get contract type label by ID
 */
export function getContractTypeLabel(typeId: string): string {
	const config = getContractTypeConfig(typeId);
	return config?.label || typeId;
}
