"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function listDismissedExternalIds(
	orgId: string,
	sourceFeedId: string,
): Promise<Set<string>> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsFeedDismissalsCollectionId!,
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("sourceFeedId", sourceFeedId),
			Query.limit(500),
		],
	});
	return new Set(
		response.rows.map((row) => String((row as { externalId?: string }).externalId)),
	);
}

export async function dismissFeedItem(params: {
	orgId: string;
	sourceFeedId: string;
	externalId: string;
	dismissedBy: string;
}): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsFeedDismissalsCollectionId!,
		rowId: ID.unique(),
		data: params,
	});
}
