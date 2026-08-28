import type {
	BriefingNewsItem,
	BriefingResponse,
	MarketQuote,
} from "@/types/briefing";
import { bbcImageAtWidth } from "@/lib/briefing/image-url";

const YAHOO_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MARKET_SYMBOLS: Array<{
	symbol: string;
	name: string;
	ticker: string;
}> = [
	{ symbol: "^GSPC", name: "S&P 500", ticker: "INX" },
	{ symbol: "^IXIC", name: "NASDAQ", ticker: "IXIC" },
	{ symbol: "^DJI", name: "Dow Jones", ticker: "DJI" },
	{ symbol: "GC=F", name: "Gold", ticker: "GC" },
	{ symbol: "CL=F", name: "Crude Oil", ticker: "CL" },
];

const BBC_RSS_URL = "https://feeds.bbci.co.uk/news/world/rss.xml";
const GOOGLE_NEWS_RSS_URL =
	"https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en";

const NO_STORE: RequestInit = { cache: "no-store" };

type YahooChartResult = {
	meta?: {
		regularMarketPrice?: number;
		regularMarketChangePercent?: number;
		chartPreviousClose?: number;
		previousClose?: number;
	};
	indicators?: {
		quote?: Array<{ close?: Array<number | null> }>;
	};
};

type YahooChartResponse = {
	chart?: {
		result?: YahooChartResult[];
	};
};

function decodeXml(value: string): string {
	return value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();
}

function firstTag(xml: string, tag: string): string {
	const match = xml.match(
		new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
	);
	return match ? decodeXml(match[1]) : "";
}

function attr(xml: string, tag: string, name: string): string {
	const match = xml.match(
		new RegExp(`<${tag}[^>]*\\s${name}="([^"]+)"`, "i"),
	);
	return match ? decodeXml(match[1]) : "";
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	ms = 8000,
): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);
	try {
		return await fetch(url, { ...NO_STORE, ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

async function fetchYahooChart(
	symbol: string,
	range: string,
	interval: string,
): Promise<YahooChartResult | null> {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
		symbol,
	)}?range=${range}&interval=${interval}&includePrePost=true`;

	const response = await fetchWithTimeout(url, {
		headers: {
			Accept: "application/json",
			"User-Agent": YAHOO_UA,
		},
	});

	if (!response.ok) return null;

	const json = (await response.json()) as YahooChartResponse;
	return json.chart?.result?.[0] ?? null;
}

function quoteFromChart(
	result: YahooChartResult | null,
	name: string,
	ticker: string,
	sparkPoints: number,
): MarketQuote | null {
	if (!result) return null;

	const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
		(value): value is number =>
			typeof value === "number" && Number.isFinite(value),
	);
	const price =
		result.meta?.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
	const previous =
		result.meta?.chartPreviousClose ??
		result.meta?.previousClose ??
		closes[0] ??
		price;
	const changePercent =
		typeof result.meta?.regularMarketChangePercent === "number"
			? result.meta.regularMarketChangePercent
			: previous === 0
				? 0
				: ((price - previous) / previous) * 100;
	const sparkline = closes.slice(-sparkPoints);

	if (!price) return null;

	return {
		name,
		ticker,
		price,
		changePercent,
		sparkline,
	};
}

async function fetchYahooQuote(
	symbol: string,
	name: string,
	ticker: string,
): Promise<MarketQuote | null> {
	// Prefer today's session (incl. pre/post) so quotes move with the market.
	const today = await fetchYahooChart(symbol, "1d", "5m");
	const fromToday = quoteFromChart(today, name, ticker, 48);
	if (fromToday) return fromToday;

	const recent = await fetchYahooChart(symbol, "5d", "15m");
	return quoteFromChart(recent, name, ticker, 24);
}

async function fetchMarkets(): Promise<MarketQuote[]> {
	const rows = await Promise.all(
		MARKET_SYMBOLS.map(async ({ symbol, name, ticker }) => {
			try {
				return await fetchYahooQuote(symbol, name, ticker);
			} catch {
				return null;
			}
		}),
	);
	return rows.filter((row): row is MarketQuote => row !== null);
}

function upgradeNewsImageUrl(url: string | null): string | null {
	if (!url) return null;
	return bbcImageAtWidth(url, 1024);
}

function largestMediaThumbnail(block: string): string | null {
	const tags = [...block.matchAll(/<media:thumbnail\b[^>]*>/gi)].map(
		(match) => match[0],
	);
	if (tags.length === 0) return null;

	let bestUrl: string | null = null;
	let bestWidth = -1;
	for (const tag of tags) {
		const url = tag.match(/\burl="([^"]+)"/i)?.[1];
		if (!url) continue;
		const width = Number(tag.match(/\bwidth="(\d+)"/i)?.[1] ?? 0);
		if (width >= bestWidth) {
			bestWidth = width;
			bestUrl = decodeXml(url);
		}
	}
	return bestUrl;
}

function metaContent(html: string, key: string): string | null {
	const propertyFirst = html.match(
		new RegExp(
			`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
			"i",
		),
	);
	const contentFirst = html.match(
		new RegExp(
			`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
			"i",
		),
	);
	const raw = propertyFirst?.[1] || contentFirst?.[1];
	return raw ? decodeXml(raw) : null;
}

async function articlePageMeta(articleUrl: string): Promise<{
	image: string | null;
	canonical: string | null;
}> {
	try {
		const response = await fetchWithTimeout(articleUrl, {
			headers: {
				Accept: "text/html",
				"User-Agent": YAHOO_UA,
			},
		});
		if (!response.ok) return { image: null, canonical: null };
		const html = await response.text();
		const og = metaContent(html, "og:image");
		const canonicalRaw =
			html.match(
				/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
			)?.[1] || metaContent(html, "og:url");
		return {
			image: og ? bbcImageAtWidth(og, 1024) : null,
			canonical: cleanArticleUrl(canonicalRaw),
		};
	} catch {
		return { image: null, canonical: null };
	}
}

function cleanArticleUrl(raw: string | null | undefined): string | null {
	if (!raw) return null;
	const trimmed = decodeXml(raw).trim();
	if (!trimmed.startsWith("http")) return null;
	try {
		const url = new URL(trimmed);
		url.hash = "";
		url.search = "";
		if (
			url.hostname === "bbc.co.uk" ||
			url.hostname === "www.bbc.co.uk" ||
			url.hostname === "bbc.com"
		) {
			url.hostname = "www.bbc.com";
		}
		return url.toString();
	} catch {
		return trimmed.split("?")[0] ?? null;
	}
}

function rssItemLink(block: string): string | null {
	const tagged = block.match(/<link>([\s\S]*?)<\/link>/i);
	if (tagged?.[1]) return decodeXml(tagged[1]);
	const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
	if (href?.[1]) return decodeXml(href[1]);
	const guid = firstTag(block, "guid");
	return guid || null;
}

function parseRssItems(xml: string, fallbackSource: string): BriefingNewsItem[] {
	const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(
		(match) => match[1],
	);

	return blocks.slice(0, 12).map((block, index) => {
		const rawTitle = firstTag(block, "title");
		const dash = rawTitle.lastIndexOf(" - ");
		const title = dash > 0 ? rawTitle.slice(0, dash).trim() : rawTitle;
		const sourceFromTitle = dash > 0 ? rawTitle.slice(dash + 3).trim() : "";
		const source =
			firstTag(block, "source") || sourceFromTitle || fallbackSource;
		const pubDate = firstTag(block, "pubDate");
		const articleUrl = cleanArticleUrl(rssItemLink(block));
		const imageUrl = upgradeNewsImageUrl(
			largestMediaThumbnail(block) || attr(block, "enclosure", "url") || null,
		);
		const publishedAt = pubDate ? new Date(pubDate).toISOString() : "";

		return {
			id: `${fallbackSource}-${index}-${title.slice(0, 32)}`,
			title,
			source,
			publishedAt: Number.isNaN(Date.parse(publishedAt)) ? "" : publishedAt,
			imageUrl,
			articleUrl,
		};
	});
}

function newestHeadlines(
	items: BriefingNewsItem[],
	count: number,
): BriefingNewsItem[] {
	const seen = new Set<string>();
	const sorted = [...items].sort((a, b) => {
		const at = Date.parse(a.publishedAt) || 0;
		const bt = Date.parse(b.publishedAt) || 0;
		return bt - at;
	});

	const picked: BriefingNewsItem[] = [];
	for (const item of sorted) {
		const key = item.title.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		picked.push(item);
		if (picked.length >= count) break;
	}
	return picked;
}

async function fetchNewsFeed(
	url: string,
	source: string,
): Promise<BriefingNewsItem[]> {
	const response = await fetchWithTimeout(url, {
		headers: {
			"User-Agent": YAHOO_UA,
			Accept: "application/rss+xml, application/xml, text/xml",
		},
	});
	if (!response.ok) return [];
	const xml = await response.text();
	return parseRssItems(xml, source).filter((item) => item.title);
}

async function fetchNews(): Promise<BriefingNewsItem[]> {
	const feeds = await Promise.all([
		fetchNewsFeed(BBC_RSS_URL, "BBC News").catch(() => [] as BriefingNewsItem[]),
		fetchNewsFeed(GOOGLE_NEWS_RSS_URL, "News").catch(
			() => [] as BriefingNewsItem[],
		),
	]);
	const headlines = newestHeadlines(feeds.flat(), 2);

	return Promise.all(
		headlines.map(async (item) => {
			if (!item.articleUrl) return item;
			const page = await articlePageMeta(item.articleUrl);
			return {
				...item,
				imageUrl: page.image || item.imageUrl,
				articleUrl: page.canonical || item.articleUrl,
			};
		}),
	);
}

export async function fetchBriefing(): Promise<BriefingResponse> {
	const [markets, news] = await Promise.all([fetchMarkets(), fetchNews()]);
	return { markets, news };
}
