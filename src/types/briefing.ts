export const MSN_MARKETS_URL =
	"https://www.msn.com/en-us/money/watchlist?id=a33k6h&tab=Markets&ocid=winp2fptaskbar&cvid=3b678eb93bce4c63ef0771a0d7b6e768&ei=4";

export const MSN_NEWS_URL =
	"https://www.msn.com/en-us/?ocid=winp2fptaskbar&cvid=ed30d4d61bd94a83e452b1cbe545b7e3";

export const BBC_NEWS_URL = "https://www.bbc.com/news";

export type MarketQuote = {
	name: string;
	ticker: string;
	price: number;
	changePercent: number;
	sparkline: number[];
};

export type BriefingNewsItem = {
	id: string;
	title: string;
	source: string;
	publishedAt: string;
	imageUrl: string | null;
	articleUrl: string | null;
};

export type BriefingResponse = {
	markets: MarketQuote[];
	news: BriefingNewsItem[];
};
