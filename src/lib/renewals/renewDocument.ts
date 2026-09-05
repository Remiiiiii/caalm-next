import { initializeOnUpload } from "@/lib/approvals/ContractApprovalWorkflowService";
import { initializeLicenseOnUpload } from "@/lib/approvals/LicenseApprovalWorkflowService";
import { isRenewalBlocked } from "@/lib/approvals/ExpirationAttestationService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function renewContractAfterExpiry(input: {
	contractId: string;
	orgId: string;
	newExpiryDate: string;
	notes?: string;
	renewedBy: string;
	userName?: string;
	userEmail?: string;
}): Promise<void> {
	const blocked = await isRenewalBlocked(
		input.orgId,
		"contract",
		input.contractId,
	);
	if (blocked) {
		throw new Error(
			"File and complete the expiration attestation before renewing",
		);
	}

	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: input.contractId,
		data: {
			contractExpiryDate: input.newExpiryDate,
			isExpired: false,
			status: "pending-review",
			approvalWorkflowState: "",
			currentApprovalStage: "",
		},
	});

	await initializeOnUpload({ contractId: input.contractId });

	await logAuditEvent({
		event_id: `contract_renew_${input.contractId}`,
		event_title: "Contract renewed after expiration",
		action: "update",
		source: "caalm",
		user_id: input.renewedBy,
		user_name: input.userName || "User",
		user_email: input.userEmail || "",
		orgId: input.orgId,
		status: "success",
		module: "contracts",
		target_type: "contract",
		target_id: input.contractId,
		summary: `Contract ${input.contractId} renewed; approval restarted`,
		metadata: {
			newExpiryDate: input.newExpiryDate,
			notes: input.notes,
		},
	});
}
