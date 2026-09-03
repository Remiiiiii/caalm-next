import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { CrmOriginLink, CrmProvider } from "./types";

function tableId(): string {
	return appwriteConfig.crmOriginLinksCollectionId || "test-crm-origin-links";
}

export async function findOriginLink(input: {
	orgId: string;
	provider: CrmProvider;
	externalId: string;
}): Promise<CrmOriginLink | null> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: tableId(),
		queries: [
			Query.equal("orgId", input.orgId),
			Query.equal("provider", input.provider),
			Query.equal("external_id", input.externalId),
			Query.limit(1),
		],
	});
	const row = response.rows[0];
	return row ? (row as unknown as CrmOriginLink) : null;
}

export async function createOriginLink(input: {
	orgId: string;
	provider: CrmProvider;
	externalId: string;
	contractId: string;
}): Promise<CrmOriginLink> {
	const { tablesDB } = await createAdminClient();
	const created = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "",
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			provider: input.provider,
			external_id: input.externalId,
			contract_id: input.contractId,
			created_at: new Date().toISOString(),
		},
	});
	return created as unknown as CrmOriginLink;
}
