import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type OrgContractLite = {
	$id: string;
	orgId?: string;
	contractNumber?: string;
	contractName?: string;
	fileId?: string;
};

export async function listOrgContractsLite(
	orgId: string,
): Promise<OrgContractLite[]> {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.contractsCollectionId || "";
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId,
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});
	return result.rows as unknown as OrgContractLite[];
}

export function indexOrgContracts(contracts: OrgContractLite[]): {
	byId: Map<string, OrgContractLite>;
	byNumber: Map<string, OrgContractLite>;
	byName: Map<string, OrgContractLite>;
} {
	const byId = new Map<string, OrgContractLite>();
	const byNumber = new Map<string, OrgContractLite>();
	const byName = new Map<string, OrgContractLite>();
	for (const contract of contracts) {
		byId.set(contract.$id, contract);
		const number = String(contract.contractNumber || "")
			.trim()
			.toLowerCase();
		if (number) byNumber.set(number, contract);
		const name = String(contract.contractName || "")
			.trim()
			.toLowerCase();
		if (name && !byName.has(name)) byName.set(name, contract);
	}
	return { byId, byNumber, byName };
}
