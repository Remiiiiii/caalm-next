"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type NewsAcknowledgment = {
	$id: string;
	orgId: string;
	userId: string;
	articleId: string;
	articleVersion?: number;
	acknowledgedAt: string;
};

export async function listAcknowledgmentsForArticle(
	orgId: string,
	articleId: string,
): Promise<NewsAcknowledgment[]> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsAcknowledgmentsCollectionId!,
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("articleId", articleId),
			Query.limit(500),
		],
	});
	return response.rows as unknown as NewsAcknowledgment[];
}

export async function getUserAcknowledgment(params: {
	orgId: string;
	userId: string;
	articleId: string;
}): Promise<NewsAcknowledgment | null> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsAcknowledgmentsCollectionId!,
		queries: [
			Query.equal("orgId", params.orgId),
			Query.equal("userId", params.userId),
			Query.equal("articleId", params.articleId),
			Query.limit(1),
		],
	});
	return (response.rows[0] as unknown as NewsAcknowledgment) || null;
}

export async function createAcknowledgment(params: {
	orgId: string;
	userId: string;
	articleId: string;
	articleVersion: number;
}): Promise<NewsAcknowledgment> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsAcknowledgmentsCollectionId!,
		rowId: ID.unique(),
		data: {
			...params,
			acknowledgedAt: new Date().toISOString(),
		},
	});
	return row as unknown as NewsAcknowledgment;
}
