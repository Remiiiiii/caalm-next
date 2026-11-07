import type { UIFileDoc } from "@/types/files";

/** Appwrite Tables rows may nest fields under `data`. Flatten so list UIs read one shape. */
export function flattenTableRow<T extends Record<string, unknown>>(row: T): T {
	const nested = (row as { data?: unknown }).data;
	if (nested && typeof nested === "object") {
		return { ...row, ...(nested as Record<string, unknown>) };
	}
	return row;
}

export function contractRowToFileDoc(
	contract: Record<string, unknown>,
	fileData?: Record<string, unknown> | null,
): UIFileDoc {
	const row = flattenTableRow(contract);
	const file = fileData ? flattenTableRow(fileData) : undefined;

	return {
		$id: String(row.$id || ""),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		$permissions: (row.$permissions as string[]) || [],
		$collectionId: String(row.$collectionId || row.$tableId || ""),
		$databaseId: String(row.$databaseId || ""),
		$sequence: Number(row.$sequence || 0),
		name: String(row.contractName || row.name || "Untitled Contract"),
		type: "document",
		extension: String(file?.extension || "pdf"),
		url: String(file?.url || ""),
		size: Number(file?.size || 0),
		owner:
			(row.contractOwnerId as string) ||
			(row.owner as string) ||
			(file?.owner as string) ||
			"",
		users: (row.users as string[]) || (file?.users as string[]) || [],
		contractId: String(row.$id || ""),
		contractName: row.contractName as string | undefined,
		contractOwnerId: row.contractOwnerId as string | undefined,
		contractExpiryDate: row.contractExpiryDate as string | undefined,
		status: row.status as UIFileDoc["status"],
		lifecycleStatus: row.lifecycleStatus as string | undefined,
		contractType: row.contractType as string | undefined,
		amount: row.amount as number | undefined,
		vendor: row.vendor as string | undefined,
		contractNumber: row.contractNumber as string | undefined,
		priority: row.priority as string | undefined,
		compliance: row.compliance as string | undefined,
		department: row.department as string | undefined,
		division: (row.division as string | undefined) || undefined,
		assignedManagers: row.assignedManagers as string[] | undefined,
		description: row.description as string | undefined,
		riskLevel: row.riskLevel as string | undefined,
		bucketFileId: (file?.bucketFileId || row.bucketFileId) as
			| string
			| undefined,
		approvalWorkflowState: row.approvalWorkflowState as string | undefined,
		digitalSignatureStatus: row.digitalSignatureStatus as string | undefined,
		digitalSignatureEnvelopeId: row.digitalSignatureEnvelopeId as
			| string
			| undefined,
		deletedAt: (row.deletedAt as string | null | undefined) ?? null,
		aiSynopsis: row.aiSynopsis as string | undefined,
		aiSynopsisGeneratedAt: row.aiSynopsisGeneratedAt as string | undefined,
		contractCategory: row.contractCategory as string | undefined,
		departmentOwner: row.departmentOwner as string | undefined,
		businessUnit: row.businessUnit as string | undefined,
		subDepartment: row.subDepartment as string | undefined,
		startDate: row.startDate as string | undefined,
		executionDate: row.executionDate as string | undefined,
		autoRenew: row.autoRenew as boolean | undefined,
		renewalNoticeDays: row.renewalNoticeDays as number | undefined,
		counterpartyLegalName: row.counterpartyLegalName as string | undefined,
		counterpartyContactTitle: row.counterpartyContactTitle as
			| string
			| undefined,
		counterpartyContactEmail: row.counterpartyContactEmail as
			| string
			| undefined,
		counterpartyContactPhone: row.counterpartyContactPhone as
			| string
			| undefined,
		counterpartyAddress: row.counterpartyAddress as string | undefined,
		counterpartyType: row.counterpartyType as string | undefined,
		counterpartyTaxId: row.counterpartyTaxId as string | undefined,
		counterpartyDunsNumber: row.counterpartyDunsNumber as string | undefined,
		currencyCode: row.currencyCode as string | undefined,
		notToExceedAmount: row.notToExceedAmount as number | undefined,
		paymentTerms: row.paymentTerms as string | undefined,
		paymentSchedule: row.paymentSchedule as string | undefined,
		budgetCode: row.budgetCode as string | undefined,
		costCenter: row.costCenter as string | undefined,
		hipaaRequired: row.hipaaRequired as boolean | undefined,
		dataPrivacyRequirements: row.dataPrivacyRequirements as string | undefined,
		backgroundCheckRequired: row.backgroundCheckRequired as boolean | undefined,
		regulatoryRequirements: row.regulatoryRequirements as string | undefined,
		auditRightsGranted: row.auditRightsGranted as boolean | undefined,
		insuranceRequired: row.insuranceRequired as boolean | undefined,
		insuranceVerifiedDate: row.insuranceVerifiedDate as string | undefined,
		insuranceExpiryDate: row.insuranceExpiryDate as string | undefined,
		insuranceCoveragePerIncident: row.insuranceCoveragePerIncident as
			| number
			| undefined,
		insuranceCoverageAggregate: row.insuranceCoverageAggregate as
			| number
			| undefined,
		indemnificationIncluded: row.indemnificationIncluded as boolean | undefined,
		keyObligations: row.keyObligations as string[] | undefined,
		serviceLevelAgreements: row.serviceLevelAgreements as string | undefined,
		performanceMetrics: row.performanceMetrics as string | undefined,
		reportingRequirements: row.reportingRequirements as string | undefined,
		postTerminationObligations: row.postTerminationObligations as
			| string
			| undefined,
		terminationNoticeDays: row.terminationNoticeDays as number | undefined,
		terminationRights: row.terminationRights as string | undefined,
		curePeriodDays: row.curePeriodDays as number | undefined,
		internalApproverIds: row.internalApproverIds as string[] | undefined,
		currentApprovalStage: row.currentApprovalStage as string | undefined,
		approvalHistoryLog: row.approvalHistoryLog as string | undefined,
		reviewerComments: row.reviewerComments as string | undefined,
		attachmentReferences: row.attachmentReferences as string[] | undefined,
		relatedDocumentIds: row.relatedDocumentIds as string[] | undefined,
		versionNumber: row.versionNumber as string | undefined,
		parentContractId: row.parentContractId as string | undefined,
		templateUsed: row.templateUsed as string | undefined,
	};
}
