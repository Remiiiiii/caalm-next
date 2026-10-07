import type { NewsArticle } from "@/lib/database/news-articles";
import { toDisplayPriority } from "@/lib/news/priority";

export function serializeNewsArticle(article: NewsArticle) {
	return {
		id: article.$id,
		title: article.title,
		content: article.excerpt || article.content,
		body: article.content,
		author: article.author || "Unknown",
		authorId: article.authorId,
		date: article.publishAt || article.publishedAt || article.$createdAt,
		type: article.type,
		priority: toDisplayPriority(article.priority),
		storedPriority: article.priority,
		department: article.department,
		departments: article.departments || [],
		roles: article.roles || [],
		image: article.imageUrl || article.thumbnailUrl,
		status: article.status,
		viewCount: article.viewCount,
		scheduledAt: article.scheduledAt,
		publishAt: article.publishAt,
		pinned: Boolean(article.pinned),
		source: article.source || "native",
		canonicalUrl: article.canonicalUrl,
		excerpt: article.excerpt,
		requiresAcknowledgment: Boolean(article.requiresAcknowledgment),
		ackDueAt: article.ackDueAt,
		articleVersion: article.articleVersion || 1,
		aiGenerated: Boolean(article.aiGenerated),
		externalId: article.externalId,
		sourceFeedId: article.sourceFeedId,
		thumbnailPrompt: article.thumbnailPrompt,
		tags: article.tags || [],
		publishedAt: article.publishedAt,
		expiresAt: article.expiresAt,
	};
}
