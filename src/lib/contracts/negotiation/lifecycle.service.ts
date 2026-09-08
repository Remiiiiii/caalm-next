import { PERMISSIONS } from "@/constants/permissions";
import { initializeOnUpload } from "@/lib/approvals/ContractApprovalWorkflowService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	buildNegotiationSnapshotFromWizardPayload,
	getWizardSessionForContract,
} from "@/lib/templates/wizard.service";
import { countOpenComments } from "./comments.logic";
import { listComments } from "./comments.service";
import { NEGOTIATION_LIFECYCLE } from "./constants";
import { loadContractForOrg } from "./contract-scope";
import { isThinNegotiationSnapshot } from "./document-model";
import {
	assertCanLeaveNegotiation,
	canStartNegotiation,
	nextStatusAfterNegotiation,
} from "./lifecycle.logic";
import { syncNegotiatedMetadataToContract } from "./sync-metadata.service";
import {
	type ContractDocumentVersion,
	createVersion,
	ensureFirstVersion,
	listVersions,
} from "./versions.service";

export async function startNegotiation(input: {
	contractId: string;
	orgId: string;
	userId: string;
	extractedText?: string;
}): Promise<{ lifecycleStatus: string }> {
	const contract = await loadContractForOrg(input.contractId, input.orgId);
	const current = String(contract.lifecycleStatus || "draft");
	if (!canStartNegotiation(current)) {
		throw new Error("This contract cannot enter negotiation");
	}
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: input.contractId,
		data: { lifecycleStatus: NEGOTIATION_LIFECYCLE },
	});
	await ensureFirstVersion({
		contractId: input.contractId,
		orgId: input.orgId,
		extractedText:
			input.extractedText ||
			String(contract.description || contract.contractName || ""),
		createdBy: input.userId,
		fileId: String(contract.fileId || ""),
		source: "manual_upload",
	});
	return { lifecycleStatus: NEGOTIATION_LIFECYCLE };
}

export async function rebuildNegotiationSnapshot(input: {
	contractId: string;
	orgId: string;
	userId: string;
}): Promise<{
	rebuilt: boolean;
	reason?: string;
	version?: ContractDocumentVersion;
}> {
	const contract = await loadContractForOrg(input.contractId, input.orgId);
	const versions = await listVersions(input.contractId);
	const current = versions[0];
	if (!current || !isThinNegotiationSnapshot(current.extractedText)) {
		return {
			rebuilt: false,
			reason: "Current snapshot already has document structure",
		};
	}

	const comments = await listComments(input.contractId);
	if (comments.some((comment) => comment.versionId === current.$id)) {
		return {
			rebuilt: false,
			reason: "Current snapshot has comments and cannot be replaced safely",
		};
	}

	const session = await getWizardSessionForContract({
		contractId: input.contractId,
		orgId: input.orgId,
	});
	if (!session?.payload.blueprintId) {
		return {
			rebuilt: false,
			reason: "No submitted blueprint wizard session is available",
		};
	}

	const extractedText = await buildNegotiationSnapshotFromWizardPayload({
		payload: session.payload,
		orgId: input.orgId,
	});
	const version = await createVersion({
		contractId: input.contractId,
		orgId: input.orgId,
		extractedText,
		createdBy: input.userId,
		changeSummary: "Rebuilt from the formatted blueprint",
		source: "wizard_submit",
		fileId: String(contract.fileId || current.fileId || ""),
	});
	return { rebuilt: true, version };
}

export async function sendForReview(input: {
	contractId: string;
	orgId: string;
	permissions: string[];
}): Promise<{ lifecycleStatus: string; status: string }> {
	const contract = await loadContractForOrg(input.contractId, input.orgId);
	const comments = await listComments(input.contractId);
	const gate = assertCanLeaveNegotiation({
		lifecycleStatus: String(contract.lifecycleStatus || ""),
		openCommentCount: countOpenComments(comments),
		hasApprovePermission: input.permissions.includes(
			PERMISSIONS.CONTRACTS.APPROVE,
		),
	});
	if (!gate.ok) {
		throw new Error(gate.reason || "Negotiation is not resolved");
	}

	try {
		await syncNegotiatedMetadataToContract({
			contractId: input.contractId,
			orgId: input.orgId,
		});
	} catch (error) {
		console.error(
			"[negotiation] metadata bridge failed before send for review",
			error,
		);
		throw new Error(
			error instanceof Error
				? `Could not sync negotiated contract facts: ${error.message}`
				: "Could not sync negotiated contract facts",
		);
	}

	const next = nextStatusAfterNegotiation();
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: input.contractId,
		data: next,
	});
	try {
		await initializeOnUpload({ contractId: input.contractId });
	} catch (error) {
		console.error("[negotiation] approval workflow init failed", error);
	}
	return next;
}
