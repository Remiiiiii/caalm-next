import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

/** Grant fundId lives here — prod Contracts table is at Appwrite column cap. */
function tableId(): string {
	return (
		appwriteConfig.contractGrantFundsCollectionId || "69d91703001f4e8c2b13"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

export async function getGrantFundIdForContract(
	orgId: string,
	contractId: string,
): Promise<string | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: contractId,
		});
		const record = row as unknown as Record<string, unknown>;
		if (String(record.orgId || "") !== orgId) return null;
		const fundId = String(record.fundId || "").trim();
		return fundId || null;
	} catch {
		return null;
	}
}

export async function listGrantFundIdsByContract(
	orgId: string,
): Promise<Map<string, string>> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [Query.equal("orgId", orgId), Query.limit(5000)],
	});
	const map = new Map<string, string>();
	for (const row of result.rows as unknown as Record<string, unknown>[]) {
		const contractId = String(row.contractId || row.$id || "").trim();
		const fundId = String(row.fundId || "").trim();
		if (contractId && fundId) map.set(contractId, fundId);
	}
	return map;
}

export async function setGrantFundIdForContract(input: {
	orgId: string;
	contractId: string;
	fundId: string | null;
}): Promise<string | null> {
	const { tablesDB } = await createAdminClient();
	const fundId = input.fundId?.trim() || null;

	if (!fundId) {
		try {
			await tablesDB.deleteRow({
				databaseId: dbId(),
				tableId: tableId(),
				rowId: input.contractId,
			});
		} catch {
			// Row may not exist yet.
		}
		return null;
	}

	const data = {
		orgId: input.orgId,
		contractId: input.contractId,
		fundId,
	};

	try {
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: input.contractId,
			data,
		});
	} catch {
		await tablesDB.createRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: input.contractId,
			data,
		});
	}

	return fundId;
}
