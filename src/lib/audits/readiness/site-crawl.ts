import type { SiteCrawlResult } from "./types";

const USER_AGENT = "CAALM-ReadinessBot/1.0 (+https://www.caalmsolutions.com)";
const MAX_PAGES = 10;
const FETCH_TIMEOUT_MS = 8000;

function absolutize(base: string, href: string): string | null {
	try {
		const url = new URL(href, base);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		url.hash = "";
		return url.toString();
	} catch {
		return null;
	}
}

function sameOrigin(a: string, b: string): boolean {
	try {
		return new URL(a).origin === new URL(b).origin;
	} catch {
		return false;
	}
}

function extractTag(
	html: string,
	pattern: RegExp,
): string | null {
	const match = html.match(pattern);
	if (!match?.[1]) return null;
	return match[1].replace(/\s+/g, " ").trim().slice(0, 300) || null;
}

function extractLinks(html: string, baseUrl: string): string[] {
	const links: string[] = [];
	const re = /<a[^>]+href=["']([^"']+)["']/gi;
	let match: RegExpExecArray | null = re.exec(html);
	while (match) {
		const abs = absolutize(baseUrl, match[1]);
		if (abs && sameOrigin(baseUrl, abs)) links.push(abs);
		match = re.exec(html);
	}
	return links;
}

async function fetchText(url: string): Promise<{
	status: number | null;
	body: string;
	error?: string;
}> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method: "GET",
			redirect: "follow",
			signal: controller.signal,
			headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain,*/*" },
		});
		const body = await res.text();
		return { status: res.status, body: body.slice(0, 500_000) };
	} catch (error) {
		return {
			status: null,
			body: "",
			error: error instanceof Error ? error.message : "Fetch failed",
		};
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Bounded public-site crawl: homepage + up to ~10 same-origin links.
 * Informational only — never folded into readiness score.
 */
export async function crawlPublicSite(
	websiteUrl: string,
): Promise<SiteCrawlResult> {
	const normalized = websiteUrl.startsWith("http")
		? websiteUrl
		: `https://${websiteUrl}`;
	const crawledAt = new Date().toISOString();
	const issues: string[] = [];
	const pages: SiteCrawlResult["pages"] = [];

	const home = await fetchText(normalized);
	if (home.error || home.status === null) {
		return {
			websiteUrl: normalized,
			crawledAt,
			pages: [
				{
					url: normalized,
					status: null,
					title: null,
					metaDescription: null,
					h1: null,
					error: home.error || "Unreachable",
				},
			],
			robotsTxtFound: false,
			sitemapFound: false,
			issues: [home.error || "Homepage unreachable"],
			healthHint: "unavailable",
		};
	}

	pages.push({
		url: normalized,
		status: home.status,
		title: extractTag(home.body, /<title[^>]*>([^<]*)<\/title>/i),
		metaDescription: extractTag(
			home.body,
			/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
		),
		h1: extractTag(home.body, /<h1[^>]*>([^<]*)<\/h1>/i),
	});

	if (home.status >= 400) {
		issues.push(`Homepage returned HTTP ${home.status}`);
	}
	if (!pages[0].title) issues.push("Homepage missing <title>");
	if (!pages[0].metaDescription) {
		issues.push("Homepage missing meta description");
	}

	const origin = new URL(normalized).origin;
	const robots = await fetchText(`${origin}/robots.txt`);
	const robotsTxtFound = Boolean(
		robots.status && robots.status < 400 && robots.body.length > 0,
	);
	const sitemap = await fetchText(`${origin}/sitemap.xml`);
	const sitemapFound = Boolean(
		sitemap.status && sitemap.status < 400 && sitemap.body.includes("<urlset"),
	);
	if (!robotsTxtFound) issues.push("robots.txt not found");
	if (!sitemapFound) issues.push("sitemap.xml not found");

	const candidates = extractLinks(home.body, normalized)
		.filter((url) => url !== normalized)
		.slice(0, MAX_PAGES - 1);

	for (const url of candidates) {
		const page = await fetchText(url);
		pages.push({
			url,
			status: page.status,
			title: page.body
				? extractTag(page.body, /<title[^>]*>([^<]*)<\/title>/i)
				: null,
			metaDescription: page.body
				? extractTag(
						page.body,
						/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
					)
				: null,
			h1: page.body
				? extractTag(page.body, /<h1[^>]*>([^<]*)<\/h1>/i)
				: null,
			error: page.error,
		});
		if (page.status && page.status >= 400) {
			issues.push(`${url} returned HTTP ${page.status}`);
		}
	}

	const healthHint =
		issues.length === 0
			? "ok"
			: pages[0]?.status && pages[0].status < 400
				? "needs_attention"
				: "unavailable";

	return {
		websiteUrl: normalized,
		crawledAt,
		pages,
		robotsTxtFound,
		sitemapFound,
		issues: issues.slice(0, 20),
		healthHint,
	};
}
