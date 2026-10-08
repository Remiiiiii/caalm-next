import type { IngestItem } from "@/lib/news/ingest/types";
import { sanitizeIngestItem } from "@/lib/news/ingest/sanitize-import";

function firstTag(block: string, tag: string): string {
	const match = block.match(
		new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
	);
	return (match?.[1] || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function attr(block: string, tag: string, name: string): string {
	const match = block.match(
		new RegExp(`<${tag}[^>]*\\s${name}=["']([^"']+)["'][^>]*>`, "i"),
	);
	return match?.[1]?.trim() || "";
}

function rssLink(block: string): string {
	const guidIsLink = /<guid[^>]*isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i;
	const guidMatch = block.match(guidIsLink);
	return (
		firstTag(block, "link") ||
		attr(block, "link", "href") ||
		guidMatch?.[1]?.trim() ||
		firstTag(block, "guid")
	);
}

function toIso(value: string): string | null {
	if (!value) return null;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export function parseRssOrAtom(xml: string): IngestItem[] {
	const rssBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(
		(match) => match[1],
	);
	const atomBlocks = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(
		(match) => match[1],
	);
	const blocks = rssBlocks.length ? rssBlocks : atomBlocks;
	const items: IngestItem[] = [];

	for (const block of blocks.slice(0, 50)) {
		const title = firstTag(block, "title");
		const canonicalUrl = rssLink(block);
		const excerpt =
			firstTag(block, "summary") ||
			firstTag(block, "description") ||
			firstTag(block, "content") ||
			"";
		const image =
			attr(block, "enclosure", "url") ||
			attr(block, "media:thumbnail", "url") ||
			attr(block, "media:content", "url") ||
			null;
		const publishedAt =
			toIso(firstTag(block, "pubDate")) ||
			toIso(firstTag(block, "published")) ||
			toIso(firstTag(block, "updated"));
		const sanitized = sanitizeIngestItem({
			externalId:
				firstTag(block, "guid") ||
				firstTag(block, "id") ||
				canonicalUrl ||
				title,
			title,
			excerpt,
			canonicalUrl,
			imageUrl: image,
			publishedAt,
			author: firstTag(block, "author") || firstTag(block, "dc:creator"),
		});
		if (sanitized) items.push(sanitized);
	}

	return items;
}
