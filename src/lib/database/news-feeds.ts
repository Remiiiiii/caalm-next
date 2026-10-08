"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { NewsFeedType } from "@/lib/news/ingest/types";

export type NewsFeed = {
	$id: string;
	orgId: string;
	name: string;
	type: NewsFeedType;
	url?: string | null;
	socialConnectionId?: string | null;
	enabled?: boolean;
	pollIntervalMinutes?: number;
	defaultDepartments?: string[];
	lastFetchedAt?: string | null;
	lastStatus?: string | null;
	lastError?: string | null;
	etag?: string | null;
	lastModified?: string | null;
	consecutiveFailures?: number;
	$createdAt: string;
	$updatedAt: string;
};

export async function listNewsFeeds(orgId: string): Promise<NewsFeed[]> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsFeedsCollectionId!,
		queries: [Query.equal("orgId", orgId), Query.limit(100)],
	});
	return response.rows as unknown as NewsFeed[];
}

export async function listEnabledNewsFeeds(): Promise<NewsFeed[]> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsFeedsCollectionId!,
		queries: [Query.equal("enabled", true), Query.limit(100)],
	});
	return response.rows as unknown as NewsFeed[];
}

export async function getNewsFeed(id: string): Promise<NewsFeed | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsFeedsCollectionId!,
			rowId: id,
		});
		return row as unknown as NewsFeed;
	} catch (error: unknown) {
		if ((error as { code?: number }).code === 404) return null;
		throw error;
	}
}

export async function createNewsFeed(params: {
	orgId: string;
	name: string;
	type: NewsFeedType;
	url?: string;
	socialConnectionId?: string;
	pollIntervalMinutes?: number;
	defaultDepartments?: string[];
	enabled?: boolean;
}): Promise<NewsFeed> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsFeedsCollectionId!,
		rowId: ID.unique(),
		data: {
			orgId: params.orgId,
			name: params.name,
			type: params.type,
			url: params.url || undefined,
			socialConnectionId: params.socialConnectionId || undefined,
			pollIntervalMinutes: params.pollIntervalMinutes ?? 60,
			defaultDepartments: params.defaultDepartments || [],
			enabled: params.enabled ?? true,
			lastStatus: "idle",
		},
	});
	return row as unknown as NewsFeed;
}

export async function updateNewsFeed(
	id: string,
	params: Partial<
		Pick<
			NewsFeed,
			| "name"
			| "url"
			| "enabled"
			| "pollIntervalMinutes"
			| "defaultDepartments"
			| "lastFetchedAt"
			| "lastStatus"
			| "lastError"
			| "etag"
			| "lastModified"
			| "consecutiveFailures"
			| "socialConnectionId"
		>
	>,
): Promise<NewsFeed> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsFeedsCollectionId!,
		rowId: id,
		data: params,
	});
	return row as unknown as NewsFeed;
}

export async function deleteNewsFeed(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.newsFeedsCollectionId!,
		rowId: id,
	});
}
