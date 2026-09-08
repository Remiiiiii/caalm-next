import { ContractService } from "@/lib/api/contracts/services/ContractService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { dbId, loadContractForOrg } from "./contract-scope";
import {
	buildNegotiatedContractPatch,
	type NegotiatedContractPatch,
} from "./sync-metadata.logic";
import { listVersions } from "./versions.service";

export type SyncNegotiatedMetadataResult = {
	patched: boolean;
	fields: string[];
	patch: NegotiatedContractPatch;
};

/**
 * Commit negotiated MetaCard / body facts onto the Contracts row (and Files mirror).
 * Call only from Send for review — not on each Accept redline.
 */
export async function syncNegotiatedMetadataToContract(input: {
	contractId: string;
	orgId: string;
}): Promise<SyncNegotiatedMetadataResult> {
	const contract = await loadContractForOrg(input.contractId, input.orgId);
	const versions = await listVersions(input.contractId);
	const latest = versions[0];
	if (!latest?.extractedText?.trim()) {
		console.warn(
			"[negotiation] sync-metadata: no version text; skipping contract row sync",
			{ contractId: input.contractId },
		);
		return { patched: false, fields: [], patch: {} };
	}

	const patch = buildNegotiatedContractPatch(latest.extractedText);
	const data: Record<string, unknown> = {};
	if (patch.contractName) data.contractName = patch.contractName;
	if (patch.vendor) data.vendor = patch.vendor;
	if (patch.department) data.department = patch.department;
	if (patch.amount != null) data.amount = patch.amount;
	if (patch.currencyCode) data.currencyCode = patch.currencyCode;
	if (patch.startDate) data.startDate = patch.startDate;
	if (patch.contractExpiryDate) {
		data.contractExpiryDate = patch.contractExpiryDate;
		if (patch.daysUntilExpiry != null) {
			data.daysUntilExpiry = patch.daysUntilExpiry;
		}
	}

	const fields = Object.keys(data);
	if (fields.length === 0) {
		console.warn(
			"[negotiation] sync-metadata: nothing parseable from version; keeping wizard row",
			{ contractId: input.contractId },
		);
		return { patched: false, fields: [], patch };
	}

	const { tablesDB } = await createAdminClient();
	try {
		await writeRowWithSchemaDriftRecovery({
			tablesDB,
			mode: "update",
			databaseId: dbId(),
			tableId: appwriteConfig.contractsCollectionId!,
			rowId: input.contractId,
			data,
		});
	} catch (error) {
		console.error("[negotiation] sync-metadata: contract update failed", error);
		throw error;
	}

	const fileId = String(contract.fileId || "").trim();
	if (fileId) {
		try {
			await ContractService.updateFileWithContractMetadata(fileId, {
				$id: input.contractId,
				...contract,
				...data,
			});
		} catch (error) {
			console.error(
				"[negotiation] sync-metadata: file mirror failed (contract row updated)",
				error,
			);
		}
	}

	return { patched: true, fields, patch };
}
