import type { Models } from "node-appwrite";

// Centralized UI-facing file document type used across components
export interface UIFileDoc extends Models.Document {
	// Core file properties used in UI
	type: string;
	extension: string;
	url: string;
	name: string;
	size: number;
	owner: { fullName: string } | string;
	users: string[];

	// Contract linkage and metadata
	contractId?: string;
	contractName?: string;
	contractOwnerId?: string;
	contractExpiryDate?: string;
	isExpired?: boolean;
	status?:
		| "active"
		| "inactive"
		| "pending-review"
		| "pending-signature"
		| "action-required"
		| "expired";
	contractType?: string;
	amount?: number;
	vendor?: string;
	contractNumber?: string;
	priority?: string;
	compliance?: string;
	department?: string;
	division?: string;
	assignedManagers?: string[];
	riskLevel?: string;
	contractCategory?: string;
	departmentOwner?: string;
	businessUnit?: string;
	subDepartment?: string;

	// Dates & timeline (beyond contractExpiryDate)
	startDate?: string;
	executionDate?: string;
	autoRenew?: boolean;
	renewalNoticeDays?: number;

	// Counterparty
	counterpartyLegalName?: string;
	counterpartyContactTitle?: string;
	counterpartyContactEmail?: string;
	counterpartyContactPhone?: string;
	counterpartyAddress?: string;
	counterpartyType?: string;
	counterpartyTaxId?: string;
	counterpartyDunsNumber?: string;

	// Financial details
	currencyCode?: string;
	notToExceedAmount?: number;
	paymentTerms?: string;
	paymentSchedule?: string;
	budgetCode?: string;
	costCenter?: string;

	// Compliance & risk
	hipaaRequired?: boolean;
	dataPrivacyRequirements?: string;
	backgroundCheckRequired?: boolean;
	regulatoryRequirements?: string;
	auditRightsGranted?: boolean;

	// Insurance & legal
	insuranceRequired?: boolean;
	insuranceVerifiedDate?: string;
	insuranceExpiryDate?: string;
	insuranceCoveragePerIncident?: number;
	insuranceCoverageAggregate?: number;
	indemnificationIncluded?: boolean;

	// Contract terms
	keyObligations?: string[];
	serviceLevelAgreements?: string;
	performanceMetrics?: string;
	reportingRequirements?: string;
	postTerminationObligations?: string;
	terminationNoticeDays?: number;
	terminationRights?: string;
	curePeriodDays?: number;

	// Approval & workflow
	internalApproverIds?: string[];
	currentApprovalStage?: string;
	approvalHistoryLog?: string;
	reviewerComments?: string;

	// Related documents & versioning
	attachmentReferences?: string[];
	relatedDocumentIds?: string[];
	versionNumber?: string;
	parentContractId?: string;
	templateUsed?: string;

	// AI-generated document synopsis, persisted once generated (see /api/expiry/synopsis)
	aiSynopsis?: string;
	aiSynopsisGeneratedAt?: string;

	// Storage/other optional attributes referenced by UI
	bucketFileId?: string;
	description?: string;
	deletedAt?: string | null;
	deletedBy?: string | null;
	approvalWorkflowState?: string;
	lifecycleStatus?: string;
	digitalSignatureStatus?: string;
	digitalSignatureEnvelopeId?: string;
	signatureDisplay?: {
		stage: "not_sent" | "sent" | "countersign";
		signedCount?: number;
		totalSigners?: number;
	};
}
