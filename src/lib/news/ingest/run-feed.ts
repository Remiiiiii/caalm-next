import { createNewsArticle, listNewsArticles } from "@/lib/database/news-articles";
import { listDismissedExternalIds } from "@/lib/database/news-feed-dismissals";
import {
	getNewsFeed,
	type NewsFeed,
	updateNewsFeed,
} from "@/lib/database/news-feeds";
import {
	decryptedAccessToken,
	getNewsSocialConnection,
} from "@/lib/database/news-social-connections";
import { filterNewIngestItems, ingestDedupeKey } from "@/lib/news/ingest/dedupe";
import { parseRssOrAtom } from "@/lib/news/ingest/parse-rss-atom";
import {
	parseWordpressJson,
	wordpressApiUrl,
} from "@/lib/news/ingest/parse-wordpress";
import { safeFetchText } from "@/lib/news/ingest/safe-fetch";
import type { IngestItem } from "@/lib/news/ingest/types";
import { fetchLinkedInPosts } from "@/lib/news/social/linkedin-adapter";
import { fetchXPosts } from "@/lib/news/social/x-adapter";

async function existingKeys(
	orgId: string,
	sourceFeedId: string,
): Promise<Set<string>> {
	const { articles } = await listNewsArticles({
		orgId,
		sourceFeedId,
		status: "all",
		limit: 200,
	});
	const dismissed = await listDismissedExternalIds(orgId, sourceFeedId);
	const keys = new Set<string>();
	for (const article of articles) {
		if (article.externalId) {
			keys.add(
				ingestDedupeKey({
					orgId,
					sourceFeedId,
					externalId: article.externalId,
				}),
			);
		}
	}
	for (const externalId of dismissed) {
		keys.add(ingestDedupeKey({ orgId, sourceFeedId, externalId }));
	}
	return keys;
}

async function fetchFeedItems(feed: NewsFeed): Promise<{
	items: IngestItem[];
	etag?: string | null;
}> {
	if (feed.type === "linkedin" || feed.type === "x") {
		if (!feed.socialConnectionId) {
			throw new Error("Social feed is missing a connection");
		}
		const connection = await getNewsSocialConnection(feed.socialConnectionId);
		if (!connection || connection.orgId !== feed.orgId) {
			throw new Error("Social connection not found");
		}
		const accessToken = await decryptedAccessToken(connection);
		const items =
			feed.type === "linkedin"
				? await fetchLinkedInPosts({
						accessToken,
						organizationUrn: connection.pageId,
					})
				: await fetchXPosts({
						accessToken,
						userId: connection.externalAccountId,
					});
		return { items };
	}

	if (!feed.url) throw new Error("Feed URL is required");
	const fetchUrl =
		feed.type === "wordpress_api" ? wordpressApiUrl(feed.url) : feed.url;
	const result = await safeFetchText(fetchUrl, { etag: feed.etag });
	if (!result) return { items: [], etag: feed.etag };

	if (feed.type === "wordpress_api") {
		return {
			items: parseWordpressJson(JSON.parse(result.body)),
			etag: result.etag,
		};
	}
	return { items: parseRssOrAtom(result.body), etag: result.etag };
}

export async function previewNewsFeed(feedId: string): Promise<IngestItem[]> {
	const feed = await getNewsFeed(feedId);
	if (!feed) throw new Error("Feed not found");
	const { items } = await fetchFeedItems(feed);
	return items.slice(0, 10);
}

export async function ingestNewsFeed(feedId: string): Promise<{
	imported: number;
	skipped: number;
}> {
	const feed = await getNewsFeed(feedId);
	if (!feed) throw new Error("Feed not found");
	try {
		const { items, etag } = await fetchFeedItems(feed);
		const keys = await existingKeys(feed.orgId, feed.$id);
		const fresh = filterNewIngestItems(items, keys, feed.orgId, feed.$id);
		for (const item of fresh) {
			await createNewsArticle({
				title: item.title,
				content: item.excerpt
					? `${item.excerpt}\n\nSource: ${item.canonicalUrl}`
					: `Source: ${item.canonicalUrl}`,
				excerpt: item.excerpt,
				canonicalUrl: item.canonicalUrl,
				imageUrl: item.imageUrl || "",
				thumbnailUrl: item.imageUrl || "",
				authorId: "system-ingest",
				author: item.author || "Imported",
				type: "info",
				priority: "medium",
				status: "pending_review",
				source: feed.type,
				externalId: item.externalId,
				sourceFeedId: feed.$id,
				orgId: feed.orgId,
				departments: feed.defaultDepartments || [],
			});
		}
		await updateNewsFeed(feed.$id, {
			lastFetchedAt: new Date().toISOString(),
			lastStatus: "ok",
			lastError: "",
			etag: etag || feed.etag || undefined,
			consecutiveFailures: 0,
		});
		return { imported: fresh.length, skipped: items.length - fresh.length };
	} catch (error) {
		await updateNewsFeed(feed.$id, {
			lastFetchedAt: new Date().toISOString(),
			lastStatus: "error",
			lastError: error instanceof Error ? error.message : "Ingest failed",
			consecutiveFailures: (feed.consecutiveFailures || 0) + 1,
		});
		throw error;
	}
}

export async function pollDueNewsFeeds(): Promise<{
	processed: number;
	imported: number;
	failed: number;
}> {
	const { listEnabledNewsFeeds } = await import("@/lib/database/news-feeds");
	const feeds = await listEnabledNewsFeeds();
	const now = Date.now();
	let processed = 0;
	let imported = 0;
	let failed = 0;
	for (const feed of feeds) {
		const failures = feed.consecutiveFailures || 0;
		const backoff = Math.min(failures, 5);
		const intervalMs =
			(feed.pollIntervalMinutes || 60) * 60 * 1000 * (1 + backoff);
		const last = feed.lastFetchedAt ? Date.parse(feed.lastFetchedAt) : 0;
		if (last && now - last < intervalMs) continue;
		processed += 1;
		try {
			const result = await ingestNewsFeed(feed.$id);
			imported += result.imported;
		} catch {
			failed += 1;
		}
	}
	return { processed, imported, failed };
}
