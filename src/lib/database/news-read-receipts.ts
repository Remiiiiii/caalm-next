"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function recordNewsReadReceipt(params: {
	orgId: string;
	userId: string;
	articleId: string;
}): Promise<void> {
	const { tablesDB } = await createAdminClient();
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsReadReceiptsCollectionId!,
		queries: [
			Query.equal("orgId", params.orgId),
			Query.equal("userId", params.userId),
			Query.equal("articleId", params.articleId),
			Query.greaterThanEqual("readAt", start.toISOString()),
			Query.limit(1),
		],
	});
	if (existing.rows.length > 0) return;
	await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsReadReceiptsCollectionId!,
		rowId: ID.unique(),
		data: {
			...params,
			readAt: new Date().toISOString(),
		},
	});
}
