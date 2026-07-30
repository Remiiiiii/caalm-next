import { appwriteConfig } from "@/lib/appwrite/config";
import { isDemoMode } from "@/lib/config/demo-mode";

/** Per-field max string length for TablesDB writes (scalar or array element). */
export type TableWriteLimits = {
	fields: Record<string, number>;
	defaultScalar?: number;
	defaultArrayElement?: number;
	enumFields?: Record<string, readonly string[]>;
};

/** Demo Contracts table — smallest known column sizes (caalm-demo). */
const DEMO_CONTRACTS_LIMITS: TableWriteLimits = {
	defaultScalar: 250,
	defaultArrayElement: 100,
	fields: {
		contractName: 128,
		description: 250,
		vendor: 50,
		fileId: 100,
		contractNumber: 50,
		orgId: 64,
		contractOwnerId: 64,
		departmentOwner: 128,
		businessUnit: 128,
		subDepartment: 128,
		counterpartyContactPhone: 100,
		counterpartyTaxId: 100,
		counterpartyDunsNumber: 100,
		versionNumber: 50,
		parentContractId: 64,
		templateUsed: 255,
		budgetCode: 255,
		costCenter: 255,
		regulatoryRequirements: 500,
		serviceLevelAgreements: 500,
		performanceMetrics: 500,
		reportingRequirements: 500,
		postTerminationObligations: 500,
		currentApprovalStage: 255,
		approvalHistoryLog: 500,
		reviewerComments: 1000,
		approvalWorkflowState: 16384,
		keyObligations: 100,
		assignedManagers: 64,
		internalApproverIds: 64,
		relatedDocumentIds: 64,
		attachmentReferences: 100,
		counterpartyLegalName: 250,
		counterpartyAddress: 250,
		dataPrivacyRequirements: 250,
		grantTerms: 250,
		donorRestrictions: 250,
		projectDescription: 250,
		propertyDescription: 250,
	},
	enumFields: {
		compliance: ["up-to-date", "action-required", "non-compliant"],
		status: ["active", "inactive", "pending-review", "action-required", "expired"],
		priority: ["Low", "Medium", "High", "Urgent"],
		department: [
			"IT",
			"Finance",
			"Legal",
			"Operations",
			"Sales",
			"Marketing",
			"Executive",
			"Engineering",
			"Administration",
		],
	},
};

const PROD_CONTRACTS_LIMITS: TableWriteLimits = {
	defaultScalar: 1000,
	defaultArrayElement: 1000,
	fields: {
		contractName: 255,
		contractNumber: 50,
		fileId: 100,
		orgId: 64,
		contractOwnerId: 64,
		departmentOwner: 128,
		businessUnit: 128,
		subDepartment: 128,
		counterpartyContactPhone: 100,
		counterpartyTaxId: 100,
		counterpartyDunsNumber: 100,
		versionNumber: 50,
		parentContractId: 64,
		templateUsed: 255,
		budgetCode: 255,
		costCenter: 255,
		assignedManagers: 64,
		internalApproverIds: 64,
		relatedDocumentIds: 64,
		approvalWorkflowState: 16384,
	},
};

const DEMO_FILES_LIMITS: TableWriteLimits = {
	defaultScalar: 250,
	defaultArrayElement: 100,
	fields: {
		name: 255,
		url: 500,
		extension: 50,
		orgId: 64,
	},
};

export function getWriteLimitsForTable(tableId: string): TableWriteLimits | undefined {
	if (tableId === appwriteConfig.contractsCollectionId) {
		return isDemoMode() ? DEMO_CONTRACTS_LIMITS : PROD_CONTRACTS_LIMITS;
	}
	if (tableId === appwriteConfig.filesCollectionId) {
		return isDemoMode() ? DEMO_FILES_LIMITS : undefined;
	}
	if (tableId === appwriteConfig.licensesCollectionId && isDemoMode()) {
		return {
			defaultScalar: 250,
			defaultArrayElement: 100,
			fields: {
				licenseName: 128,
				licenseNumber: 50,
				orgId: 64,
			},
		};
	}
	return undefined;
}
