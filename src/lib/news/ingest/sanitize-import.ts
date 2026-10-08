import {
	EXCERPT_MAX_LENGTH,
	IMPORT_CONTENT_MAX_LENGTH,
	TITLE_MAX_LENGTH,
	type IngestItem,
} from "@/lib/news/ingest/types";

const SCRIPT_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const TAG_RE = /<[^>]+>/g;

export function stripImportedHtml(value: string): string {
	return value
		.replace(SCRIPT_RE, " ")
		.replace(TAG_RE, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/\s+/g, " ")
		.trim();
}

export function clampText(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max - 1).trim()}…`;
}

export function isHttpUrl(value: string | null | undefined): boolean {
	if (!value) return false;
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}

export function sanitizeIngestItem(item: IngestItem): IngestItem | null {
	const title = clampText(stripImportedHtml(item.title || ""), TITLE_MAX_LENGTH);
	if (!title) return null;

	const excerpt = clampText(
		stripImportedHtml(item.excerpt || ""),
		EXCERPT_MAX_LENGTH,
	);
	const canonicalUrl = isHttpUrl(item.canonicalUrl) ? item.canonicalUrl : "";
	if (!canonicalUrl) return null;

	const imageUrl = isHttpUrl(item.imageUrl) ? item.imageUrl : null;
	const externalId = stripImportedHtml(item.externalId || canonicalUrl).slice(
		0,
		191,
	);
	if (!externalId) return null;

	return {
		externalId,
		title,
		excerpt: clampText(excerpt, IMPORT_CONTENT_MAX_LENGTH),
		canonicalUrl,
		imageUrl,
		publishedAt: item.publishedAt || null,
		author: item.author ? stripImportedHtml(item.author).slice(0, 255) : null,
	};
}
