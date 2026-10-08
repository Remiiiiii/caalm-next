import type { IngestItem } from "@/lib/news/ingest/types";
import { sanitizeIngestItem } from "@/lib/news/ingest/sanitize-import";

type WordpressPost = {
	id?: number | string;
	slug?: string;
	link?: string;
	date?: string;
	title?: { rendered?: string } | string;
	excerpt?: { rendered?: string } | string;
	jetpack_featured_media_url?: string;
	_embedded?: {
		"wp:featuredmedia"?: Array<{ source_url?: string }>;
	};
};

function rendered(value: WordpressPost["title"]): string {
	if (!value) return "";
	if (typeof value === "string") return value;
	return value.rendered || "";
}

export function parseWordpressJson(payload: unknown): IngestItem[] {
	const rows = Array.isArray(payload) ? payload : [];
	const items: IngestItem[] = [];
	for (const row of rows.slice(0, 50) as WordpressPost[]) {
		const title = rendered(row.title);
		const canonicalUrl = row.link || "";
		const excerpt = rendered(row.excerpt);
		const image =
			row.jetpack_featured_media_url ||
			row._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
			null;
		const sanitized = sanitizeIngestItem({
			externalId: String(row.id || row.slug || canonicalUrl || title),
			title,
			excerpt,
			canonicalUrl,
			imageUrl: image,
			publishedAt: row.date || null,
		});
		if (sanitized) items.push(sanitized);
	}
	return items;
}

export function wordpressApiUrl(siteUrl: string): string {
	const url = new URL(siteUrl);
	if (url.pathname.includes("/wp-json/")) return url.toString();
	url.pathname = "/wp-json/wp/v2/posts";
	url.search = "per_page=20&_embed=1";
	return url.toString();
}
