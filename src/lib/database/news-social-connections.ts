"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { decryptSecret, encryptSecret } from "@/lib/news/social/crypto";

export type NewsSocialProvider = "linkedin" | "x";

export type NewsSocialConnection = {
	$id: string;
	orgId: string;
	provider: NewsSocialProvider;
	accessToken?: string | null;
	refreshToken?: string | null;
	expiresAt?: string | null;
	externalAccountId?: string | null;
	pageId?: string | null;
	scopes?: string | null;
	connectedBy?: string | null;
	$createdAt?: string;
	$updatedAt?: string;
};

export async function listNewsSocialConnections(
	orgId: string,
): Promise<NewsSocialConnection[]> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsSocialConnectionsCollectionId!,
		queries: [Query.equal("orgId", orgId), Query.limit(50)],
	});
	return (response.rows as unknown as NewsSocialConnection[]).map((row) => ({
		...row,
		accessToken: undefined,
		refreshToken: undefined,
	}));
}

export async function getNewsSocialConnection(
	id: string,
): Promise<NewsSocialConnection | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsSocialConnectionsCollectionId!,
			rowId: id,
		});
		return row as unknown as NewsSocialConnection;
	} catch (error: unknown) {
		if ((error as { code?: number }).code === 404) return null;
		throw error;
	}
}

export async function decryptedAccessToken(
	connection: NewsSocialConnection,
): Promise<string> {
	if (!connection.accessToken) throw new Error("Missing access token");
	return decryptSecret(connection.accessToken);
}

export async function upsertNewsSocialConnection(params: {
	orgId: string;
	provider: NewsSocialProvider;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: string;
	externalAccountId?: string;
	pageId?: string;
	scopes?: string;
	connectedBy: string;
}): Promise<NewsSocialConnection> {
	const { tablesDB } = await createAdminClient();
	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsSocialConnectionsCollectionId!,
		queries: [
			Query.equal("orgId", params.orgId),
			Query.equal("provider", params.provider),
			Query.limit(1),
		],
	});
	const data = {
		orgId: params.orgId,
		provider: params.provider,
		accessToken: encryptSecret(params.accessToken),
		refreshToken: params.refreshToken
			? encryptSecret(params.refreshToken)
			: undefined,
		expiresAt: params.expiresAt,
		externalAccountId: params.externalAccountId,
		pageId: params.pageId,
		scopes: params.scopes,
		connectedBy: params.connectedBy,
	};
	if (existing.rows[0]) {
		const row = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsSocialConnectionsCollectionId!,
			rowId: existing.rows[0].$id,
			data,
		});
		return row as unknown as NewsSocialConnection;
	}
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsSocialConnectionsCollectionId!,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as NewsSocialConnection;
}

export async function deleteNewsSocialConnection(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsSocialConnectionsCollectionId!,
		rowId: id,
	});
}
