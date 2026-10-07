"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	isArticleVisibleToAudience,
	type NewsReaderAudience,
} from "@/lib/news/audience";
import { toStoredPriority } from "@/lib/news/priority";
import { sortNewsForFeed } from "@/lib/news/sort";
import type { NewsArticleSource } from "@/lib/news/ingest/types";

export type NewsArticleStatus =
	| "draft"
	| "published"
	| "archived"
	| "scheduled"
	| "pending_review";

export interface NewsArticle {
	$id: string;
	title: string;
	content: string;
	authorId: string;
	author?: string;
	department?: string;
	departments?: string[];
	roles?: string[];
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	status: NewsArticleStatus;
	thumbnailUrl?: string;
	thumbnailPrompt?: string;
	tags?: string[];
	viewCount?: number;
	publishedAt?: string;
	expiresAt?: string;
	scheduledAt?: string;
	publishAt?: string;
	pinned?: boolean;
	source?: NewsArticleSource;
	externalId?: string;
	sourceFeedId?: string;
	canonicalUrl?: string;
	excerpt?: string;
	imageUrl?: string;
	approvedBy?: string;
	requiresAcknowledgment?: boolean;
	ackDueAt?: string;
	articleVersion?: number;
	aiGenerated?: boolean;
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
	departments?: string[];
	roles?: string[];
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low" | "normal";
	status?: NewsArticleStatus;
	thumbnailUrl?: string;
	thumbnailPrompt?: string;
	tags?: string[];
	orgId?: string;
	scheduledAt?: string;
	publishAt?: string;
	expiresAt?: string;
	pinned?: boolean;
	source?: NewsArticleSource;
	externalId?: string;
	sourceFeedId?: string;
	canonicalUrl?: string;
	excerpt?: string;
	imageUrl?: string;
	requiresAcknowledgment?: boolean;
	ackDueAt?: string;
	articleVersion?: number;
	aiGenerated?: boolean;
	approvedBy?: string;
}

export interface UpdateNewsArticleParams {
	title?: string;
	content?: string;
	department?: string;
	departments?: string[];
	roles?: string[];
	type?: "announcement" | "update" | "alert" | "info";
	priority?: "high" | "medium" | "low" | "normal";
	status?: NewsArticleStatus;
	thumbnailUrl?: string;
	thumbnailPrompt?: string;
	tags?: string[];
	expiresAt?: string;
	scheduledAt?: string;
	publishAt?: string;
	pinned?: boolean;
	source?: NewsArticleSource;
	externalId?: string;
	sourceFeedId?: string;
	canonicalUrl?: string;
	excerpt?: string;
	imageUrl?: string;
	requiresAcknowledgment?: boolean;
	ackDueAt?: string;
	articleVersion?: number;
	aiGenerated?: boolean;
	approvedBy?: string;
	publishedAt?: string;
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
	sourceFeedId?: string;
	audience?: NewsReaderAudience;
	forReader?: boolean;
}

function compactData(data: Record<string, unknown>): Record<string, unknown> {
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== undefined) next[key] = value;
	}
	return next;
}

export async function createNewsArticle(
	params: CreateNewsArticleParams,
): Promise<NewsArticle> {
	try {
		const { tablesDB } = await createAdminClient();
		const departments = params.departments || [];
		const articleData = compactData({
			title: params.title,
			content: params.content,
			authorId: params.authorId,
			author: params.author || "",
			department: params.department || departments[0] || "",
			departments,
			roles: params.roles || [],
			type: params.type,
			priority: toStoredPriority(params.priority),
			status: params.status || "draft",
			thumbnailUrl: params.thumbnailUrl || params.imageUrl || "",
			thumbnailPrompt: params.thumbnailPrompt || "",
			tags: params.tags || [],
			viewCount: 0,
			orgId: params.orgId || "",
			pinned: Boolean(params.pinned),
			source: params.source || "native",
			excerpt: params.excerpt || "",
			canonicalUrl: params.canonicalUrl || "",
			imageUrl: params.imageUrl || "",
			requiresAcknowledgment: Boolean(params.requiresAcknowledgment),
			articleVersion: params.articleVersion ?? 1,
			aiGenerated: Boolean(params.aiGenerated),
			scheduledAt: params.scheduledAt,
			publishAt: params.publishAt || params.scheduledAt,
			expiresAt: params.expiresAt,
			externalId: params.externalId,
			sourceFeedId: params.sourceFeedId,
			ackDueAt: params.ackDueAt,
			approvedBy: params.approvedBy,
		});

		const article = await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: ID.unique(),
			data: articleData,
		});

		return article as unknown as NewsArticle;
	} catch (error) {
		console.error("Error creating news article:", error);
		throw error;
	}
}

export async function getNewsArticle(id: string): Promise<NewsArticle | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const article = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
		});
		return article as unknown as NewsArticle;
	} catch (error: unknown) {
		if ((error as { code?: number }).code === 404) {
			return null;
		}
		console.error("Error fetching news article:", error);
		throw error;
	}
}

export async function updateNewsArticle(
	id: string,
	params: UpdateNewsArticleParams,
): Promise<NewsArticle> {
	try {
		const { tablesDB } = await createAdminClient();
		const updateData: Record<string, unknown> = {};
		if (params.title !== undefined) updateData.title = params.title;
		if (params.content !== undefined) updateData.content = params.content;
		if (params.department !== undefined)
			updateData.department = params.department;
		if (params.departments !== undefined)
			updateData.departments = params.departments;
		if (params.roles !== undefined) updateData.roles = params.roles;
		if (params.type !== undefined) updateData.type = params.type;
		if (params.priority !== undefined)
			updateData.priority = toStoredPriority(params.priority);
		if (params.status !== undefined) updateData.status = params.status;
		if (params.thumbnailUrl !== undefined)
			updateData.thumbnailUrl = params.thumbnailUrl;
		if (params.thumbnailPrompt !== undefined)
			updateData.thumbnailPrompt = params.thumbnailPrompt;
		if (params.tags !== undefined) updateData.tags = params.tags;
		if (params.expiresAt !== undefined) updateData.expiresAt = params.expiresAt;
		if (params.scheduledAt !== undefined)
			updateData.scheduledAt = params.scheduledAt;
		if (params.publishAt !== undefined) updateData.publishAt = params.publishAt;
		if (params.pinned !== undefined) updateData.pinned = params.pinned;
		if (params.source !== undefined) updateData.source = params.source;
		if (params.externalId !== undefined)
			updateData.externalId = params.externalId;
		if (params.sourceFeedId !== undefined)
			updateData.sourceFeedId = params.sourceFeedId;
		if (params.canonicalUrl !== undefined)
			updateData.canonicalUrl = params.canonicalUrl;
		if (params.excerpt !== undefined) updateData.excerpt = params.excerpt;
		if (params.imageUrl !== undefined) updateData.imageUrl = params.imageUrl;
		if (params.requiresAcknowledgment !== undefined)
			updateData.requiresAcknowledgment = params.requiresAcknowledgment;
		if (params.ackDueAt !== undefined) updateData.ackDueAt = params.ackDueAt;
		if (params.articleVersion !== undefined)
			updateData.articleVersion = params.articleVersion;
		if (params.aiGenerated !== undefined)
			updateData.aiGenerated = params.aiGenerated;
		if (params.approvedBy !== undefined)
			updateData.approvedBy = params.approvedBy;
		if (params.publishedAt !== undefined)
			updateData.publishedAt = params.publishedAt;

		const article = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
			data: updateData,
		});

		return article as unknown as NewsArticle;
	} catch (error) {
		console.error("Error updating news article:", error);
		throw error;
	}
}

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

export async function publishNewsArticle(
	id: string,
	publish: boolean,
): Promise<NewsArticle> {
	try {
		const { tablesDB } = await createAdminClient();
		const updateData: Record<string, unknown> = {
			status: publish ? "published" : "draft",
		};
		if (publish) {
			updateData.publishedAt = new Date().toISOString();
			updateData.publishAt = new Date().toISOString();
		}
		const article = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
			data: updateData,
		});
		return article as unknown as NewsArticle;
	} catch (error) {
		console.error("Error publishing news article:", error);
		throw error;
	}
}

export async function listNewsArticles(
	params: ListNewsArticlesParams = {},
): Promise<{ articles: NewsArticle[]; total: number }> {
	try {
		const { tablesDB } = await createAdminClient();
		const queries: string[] = [];

		if (params.orgId) {
			queries.push(Query.equal("orgId", params.orgId));
		}
		if (params.type && params.type !== "all") {
			queries.push(Query.equal("type", params.type));
		}
		if (params.priority && params.priority !== "all") {
			const stored =
				params.priority === "normal" ? "medium" : params.priority;
			queries.push(Query.equal("priority", stored));
		}
		if (params.department && params.department !== "all") {
			queries.push(Query.equal("department", params.department));
		}
		if (params.sourceFeedId) {
			queries.push(Query.equal("sourceFeedId", params.sourceFeedId));
		}
		if (params.status && params.status !== "all") {
			queries.push(Query.equal("status", params.status));
		}
		if (params.search) {
			queries.push(
				Query.or([
					Query.search("title", params.search),
					Query.search("content", params.search),
				]),
			);
		}

		queries.push(Query.orderDesc("$createdAt"));
		const fetchLimit = params.forReader
			? Math.min(Math.max((params.limit || 20) + (params.offset || 0), 50), 100)
			: params.limit || 20;
		const fetchOffset = params.forReader ? 0 : params.offset || 0;
		queries.push(Query.limit(fetchLimit));
		queries.push(Query.offset(fetchOffset));

		const response = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			queries,
		});

		let articles = response.rows as unknown as NewsArticle[];
		if (params.forReader && params.audience) {
			articles = articles.filter((article) =>
				isArticleVisibleToAudience(article, params.audience!),
			);
			articles = sortNewsForFeed(articles);
			const offset = params.offset || 0;
			const limit = params.limit || 20;
			const total = articles.length;
			return {
				articles: articles.slice(offset, offset + limit),
				total,
			};
		}

		return {
			articles: sortNewsForFeed(articles),
			total: response.total,
		};
	} catch (error) {
		console.error("Error listing news articles:", error);
		throw error;
	}
}

export async function incrementViewCount(id: string): Promise<void> {
	try {
		const { tablesDB } = await createAdminClient();
		const article = await getNewsArticle(id);
		if (!article) {
			throw new Error("Article not found");
		}
		await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.newsArticlesCollectionId!,
			rowId: id,
			data: { viewCount: (article.viewCount || 0) + 1 },
		});
	} catch (error) {
		console.error("Error incrementing view count:", error);
	}
}
