import {
	BBC_NEWS_URL,
	GOOGLE_NEWS_URL,
	type BriefingNewsItem,
} from "@/types/briefing";

export type NewsHeaderLink = {
	label: string;
	href: string;
};

export function shownNews(news: BriefingNewsItem[]): BriefingNewsItem[] {
	return news.slice(0, 2);
}

function normalizeSource(source: string): string {
	return source.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isBbcOutlet(item: BriefingNewsItem): boolean {
	return item.feed === "bbc" || /bbc/i.test(item.source);
}

/** True when the two visible cards are from different publishers. */
export function isMixedNewsOutlets(news: BriefingNewsItem[]): boolean {
	const sources = [
		...new Set(
			shownNews(news)
				.map((item) => normalizeSource(item.source))
				.filter(Boolean),
		),
	];
	return sources.length > 1;
}

export function showGoogleNewsCardLink(
	news: BriefingNewsItem[],
	item: BriefingNewsItem,
): boolean {
	const cards = shownNews(news);
	const hasBbc = cards.some(isBbcOutlet);
	return isMixedNewsOutlets(news) && hasBbc && !isBbcOutlet(item);
}

/** Header shortcut follows BBC when a BBC story is on screen. */
export function newsHeaderLinks(
	news: BriefingNewsItem[],
): NewsHeaderLink[] {
	const hasBbc = shownNews(news).some(isBbcOutlet);
	return [
		{
			label: "See news",
			href: hasBbc ? BBC_NEWS_URL : GOOGLE_NEWS_URL,
		},
	];
}
