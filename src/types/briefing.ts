/** Same Yahoo symbols the briefing chart API fetches (^GSPC, ^IXIC, ^DJI, GC=F, CL=F). */
export const YAHOO_FINANCE_MARKETS_URL =
	"https://finance.yahoo.com/quotes/%5EGSPC,%5EIXIC,%5EDJI,GC=F,CL=F";

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
