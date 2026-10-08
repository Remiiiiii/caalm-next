"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type NewsSystemSettings = {
	$id: string;
	orgId: string;
	enableContractRenewal?: boolean;
	enablePolicyUpdates?: boolean;
	enableRegulationAlerts?: boolean;
};

export async function getNewsSystemSettings(
	orgId: string,
): Promise<NewsSystemSettings | null> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsSystemSettingsCollectionId!,
		queries: [Query.equal("orgId", orgId), Query.limit(1)],
	});
	return (response.rows[0] as unknown as NewsSystemSettings) || null;
}

export async function upsertNewsSystemSettings(params: {
	orgId: string;
	enableContractRenewal?: boolean;
	enablePolicyUpdates?: boolean;
	enableRegulationAlerts?: boolean;
}): Promise<NewsSystemSettings> {
	const { tablesDB } = await createAdminClient();
	const existing = await getNewsSystemSettings(params.orgId);
	if (existing) {
		const row = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsSystemSettingsCollectionId!,
			rowId: existing.$id,
			data: params,
		});
		return row as unknown as NewsSystemSettings;
	}
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsSystemSettingsCollectionId!,
		rowId: ID.unique(),
		data: {
			orgId: params.orgId,
			enableContractRenewal: Boolean(params.enableContractRenewal),
			enablePolicyUpdates: Boolean(params.enablePolicyUpdates),
			enableRegulationAlerts: Boolean(params.enableRegulationAlerts),
		},
	});
	return row as unknown as NewsSystemSettings;
}
