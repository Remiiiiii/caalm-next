import { prioritySortRank } from "@/lib/news/priority";

export type SortableNewsArticle = {
	pinned?: boolean | null;
	priority?: string | null;
	publishAt?: string | null;
	publishedAt?: string | null;
	$createdAt?: string | null;
	date?: string | null;
};

function articleTime(article: SortableNewsArticle): number {
	const raw =
		article.publishAt ||
		article.publishedAt ||
		article.date ||
		article.$createdAt ||
		"";
	const ms = Date.parse(raw);
	return Number.isNaN(ms) ? 0 : ms;
}

/** Pinned first, then high priority, then newest date. */
export function compareNewsForFeed(
	a: SortableNewsArticle,
	b: SortableNewsArticle,
): number {
	const pinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
	if (pinned !== 0) return pinned;
	const priority = prioritySortRank(a.priority) - prioritySortRank(b.priority);
	if (priority !== 0) return priority;
	return articleTime(b) - articleTime(a);
}

export function sortNewsForFeed<T extends SortableNewsArticle>(items: T[]): T[] {
	return [...items].sort(compareNewsForFeed);
}
