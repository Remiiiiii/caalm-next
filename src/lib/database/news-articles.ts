"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export interface NewsArticle {
	$id: string;
	title: string;
	content: string;
	authorId: string;
	author?: string; // For display purposes
	department?: string;
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	status: "draft" | "published" | "archived";
	thumbnailUrl?: string;
	thumbnailPrompt?: string;
	tags?: string[];
	viewCount?: number;
	publishedAt?: string;
	expiresAt?: string;
	scheduledAt?: string;
	orgId?: string;
	$createdAt: string;
	$updatedAt: string;
}

export interface CreateNewsArticleParams {
	title: string;
	content: string;
	authorId: string;
	author?: string;
	department?: string;
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	status?: "draft" | "published" | "archived";
	thumbnailUrl?: string;
	thumbnailPrompt?: string;
	tags?: string[];
	orgId?: string;
	scheduledAt?: string;
	expiresAt?: string;
}

export interface UpdateNewsArticleParams {
	title?: string;
	content?: string;
	department?: string;
	type?: "announcement" | "update" | "alert" | "info";
	priority?: "high" | "medium" | "low";
	status?: "draft" | "published" | "archived";
	thumbnailUrl?: string;
	thumbnailPrompt?: string;
	tags?: string[];
	expiresAt?: string;
	scheduledAt?: string;
}

export interface ListNewsArticlesParams {
	limit?: number;
	offset?: number;
	type?: string;
	priority?: string;
	department?: string;
	status?: string;
	search?: string;
	orgId?: string;
}

/**
 * Create a new news article
 */
export async function createNewsArticle(
	params: CreateNewsArticleParams,
): Promise<NewsArticle> {
	try {
		const { tablesDB } = await createAdminClient();

		const articleData = {
			title: params.title,
			content: params.content,
			authorId: params.authorId,
			author: params.author || "",
			department: params.department || "",
			type: params.type,
			priority: params.priority,
			status: params.status || "draft",
			thumbnailUrl: params.thumbnailUrl || "",
			thumbnailPrompt: params.thumbnailPrompt || "",
			tags: params.tags || [],
			viewCount: 0,
			orgId: params.orgId || "",
			...(params.scheduledAt && { scheduledAt: params.scheduledAt }),
			...(params.expiresAt && { expiresAt: params.expiresAt }),
		};

		const article = await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: ID.unique(),
			data: articleData,
		});

		return article as NewsArticle;
	} catch (error) {
		console.error("Error creating news article:", error);
		throw error;
	}
}

/**
 * Get a single news article by ID
 */
export async function getNewsArticle(id: string): Promise<NewsArticle | null> {
	try {
		const { tablesDB } = await createAdminClient();

		const article = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
		});

		return article as NewsArticle;
	} catch (error: any) {
		if (error.code === 404) {
			return null;
		}
		console.error("Error fetching news article:", error);
		throw error;
	}
}

/**
 * Update a news article
 */
export async function updateNewsArticle(
	id: string,
	params: UpdateNewsArticleParams,
): Promise<NewsArticle> {
	try {
		const { tablesDB } = await createAdminClient();

		const updateData: Record<string, any> = {};
		if (params.title !== undefined) updateData.title = params.title;
		if (params.content !== undefined) updateData.content = params.content;
		if (params.department !== undefined)
			updateData.department = params.department;
		if (params.type !== undefined) updateData.type = params.type;
		if (params.priority !== undefined) updateData.priority = params.priority;
		if (params.status !== undefined) updateData.status = params.status;
		if (params.thumbnailUrl !== undefined)
			updateData.thumbnailUrl = params.thumbnailUrl;
		if (params.thumbnailPrompt !== undefined)
			updateData.thumbnailPrompt = params.thumbnailPrompt;
		if (params.tags !== undefined) updateData.tags = params.tags;
		if (params.expiresAt !== undefined) updateData.expiresAt = params.expiresAt;
		if (params.scheduledAt !== undefined)
			updateData.scheduledAt = params.scheduledAt;

		const article = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
			data: updateData,
		});

		return article as NewsArticle;
	} catch (error) {
		console.error("Error updating news article:", error);
		throw error;
	}
}

/**
 * Delete a news article (soft delete by setting status to archived)
 */
export async function deleteNewsArticle(
	id: string,
	hardDelete: boolean = false,
): Promise<void> {
	try {
		const { tablesDB } = await createAdminClient();

		if (hardDelete) {
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.newsArticlesCollectionId!,
				rowId: id,
			});
		} else {
			// Soft delete
			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.newsArticlesCollectionId!,
				rowId: id,
				data: { status: "archived" },
			});
		}
	} catch (error) {
		console.error("Error deleting news article:", error);
		throw error;
	}
}

/**
 * Publish or unpublish a news article
 */
export async function publishNewsArticle(
	id: string,
	publish: boolean,
): Promise<NewsArticle> {
	try {
		const { tablesDB } = await createAdminClient();

		const updateData: Record<string, any> = {
			status: publish ? "published" : "draft",
		};

		if (publish) {
			updateData.publishedAt = new Date().toISOString();
		}

		const article = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
			data: updateData,
		});

		return article as NewsArticle;
	} catch (error) {
		console.error("Error publishing news article:", error);
		throw error;
	}
}

/**
 * List news articles with filters and pagination
 */
export async function listNewsArticles(
	params: ListNewsArticlesParams = {},
): Promise<{ articles: NewsArticle[]; total: number }> {
	try {
		const { tablesDB } = await createAdminClient();

		const queries: string[] = [];

		// Filter by organization
		if (params.orgId) {
			queries.push(Query.equal("orgId", params.orgId));
		}

		// Filter by type
		if (params.type && params.type !== "all") {
			queries.push(Query.equal("type", params.type));
		}

		// Filter by priority
		if (params.priority && params.priority !== "all") {
			queries.push(Query.equal("priority", params.priority));
		}

		// Filter by department
		if (params.department && params.department !== "all") {
			queries.push(Query.equal("department", params.department));
		}

		// Filter by status
		if (params.status && params.status !== "all") {
			queries.push(Query.equal("status", params.status));
		}

		// Search query (title or content)
		if (params.search) {
			queries.push(
				Query.or([
					Query.search("title", params.search),
					Query.search("content", params.search),
				]),
			);
		}

		// Order by created date (newest first)
		queries.push(Query.orderDesc("$createdAt"));

		// Pagination
		const limit = params.limit || 20;
		const offset = params.offset || 0;
		queries.push(Query.limit(limit));
		queries.push(Query.offset(offset));

		const response = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			queries,
		});

		return {
			articles: response.rows as NewsArticle[],
			total: response.total,
		};
	} catch (error) {
		console.error("Error listing news articles:", error);
		throw error;
	}
}

/**
 * Increment view count for an article
 */
export async function incrementViewCount(id: string): Promise<void> {
	try {
		const { tablesDB } = await createAdminClient();

		const article = await getNewsArticle(id);
		if (!article) {
			throw new Error("Article not found");
		}

		const currentViewCount = article.viewCount || 0;
		await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
			data: { viewCount: currentViewCount + 1 },
		});
	} catch (error) {
		console.error("Error incrementing view count:", error);
		// Don't throw - view count is not critical
	}
}
