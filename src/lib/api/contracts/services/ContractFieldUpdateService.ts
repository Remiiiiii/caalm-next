import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import CacheManager from "@/lib/services/cache-manager";

/** Fields an assistant/agent may patch on a live contract. Never fileId, contractOwnerId, orgId, or approval/signature state. */
const ALLOWED_FIELDS = [
	"contractName",
	"vendor",
	"amount",
	"contractExpiryDate",
	"description",
	"status",
] as const;

export type ContractFieldPatch = Partial<
	Record<(typeof ALLOWED_FIELDS)[number], string>
>;

/**
 * Contract Field Update Service
 * Safe, allowlisted, org-scoped field updates for a live contract record.
 */
export class ContractFieldUpdateService {
	static async updateContractFields(input: {
		contractId: string;
		orgId: string;
		patch: ContractFieldPatch;
	}) {
		const { tablesDB } = await createAdminClient();
		const tableId = appwriteConfig.contractsCollectionId || "contracts";
		const databaseId = appwriteConfig.databaseId!;

		const existing = await tablesDB.getRow({
			databaseId,
			tableId,
			rowId: input.contractId,
		});
		if (!existing || (existing as { orgId?: string }).orgId !== input.orgId) {
			throw new Error("Contract not found in this organization");
		}

		const data: Record<string, string> = {};
		for (const field of ALLOWED_FIELDS) {
			const value = input.patch[field];
			if (value !== undefined) data[field] = value;
		}
		if (Object.keys(data).length === 0) {
			throw new Error("No updatable fields were provided");
		}

		const updated = await tablesDB.updateRow({
			databaseId,
			tableId,
			rowId: input.contractId,
			data,
		});

		await CacheManager.invalidateContracts(undefined, input.contractId).catch(
			() => undefined,
		);

		return updated as unknown as Record<string, unknown>;
	}
}
