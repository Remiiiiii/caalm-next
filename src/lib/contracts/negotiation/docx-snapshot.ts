import { docxBufferToHtml } from "@/lib/templates/docx-preview";

export interface NegotiationSnapshotMetadata {
	label: string;
	value: string;
}

const DOCX_SNAPSHOT_MARKER = "<!-- negotiation-snapshot:docx -->";
const NUMBERED_HEADING_RE = /^(\d+)[.)]\s+(.+)$/;
const INLINE_METADATA_RE = /^[A-Za-z][A-Za-z /&()'-]{1,39}:\s+\S+/;

function decodeHtml(value: string): string {
	return value
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCodePoint(Number(code)),
		);
}

function inlineHtmlToMarkdown(value: string): string {
	return decodeHtml(
		value
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
			.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_")
			.replace(/<[^>]+>/g, ""),
	)
		.replace(/[ \t]+/g, " ")
		.replace(/ *\n */g, "\n")
		.trim();
}

function stripPresentationOnlyHtml(html: string): string {
	return html
		.replace(
			/<div\b[^>]*class=["'][^"']*\bdocx-letterhead\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
			"",
		)
		.replace(
			/<div\b[^>]*class=["'][^"']*\bdocx-letterhead\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi,
			"",
		)
		.replace(/<img\b[^>]*>/gi, "");
}

/**
 * Convert the merged DOCX HTML into the stable markdown stored as a
 * negotiation version. It keeps authored headings, bold terms, paragraphs,
 * and one list item per line, but removes PDF-only presentation.
 */
export function negotiationSnapshotFromHtml(
	html: string,
	metadata: NegotiationSnapshotMetadata[],
): string {
	const cleaned = stripPresentationOnlyHtml(html);
	const blocks =
		cleaned.match(/<(?:h[1-6]|p|li)\b[^>]*>[\s\S]*?<\/(?:h[1-6]|p|li)>/gi) ||
		[];
	const body: string[] = [];
	let title = "";
	let sawSection = false;

	for (const block of blocks) {
		const openTag = block.match(/^<([a-z0-9]+)\b([^>]*)>/i);
		if (!openTag) continue;
		const tag = openTag[1].toLowerCase();
		const attributes = openTag[2] || "";
		const inner = block.replace(/^<[^>]+>/, "").replace(/<\/[^>]+>$/, "");
		const text = inlineHtmlToMarkdown(inner);
		if (!text) continue;

		const isTitle =
			/\bdocx-title\b/i.test(attributes) ||
			(tag === "h1" && !NUMBERED_HEADING_RE.test(text));
		if (isTitle && !title) {
			title = text.replace(/\*\*/g, "");
			continue;
		}

		const numberedHeading = NUMBERED_HEADING_RE.exec(
			text.replace(/\*\*/g, "").trim(),
		);
		const isHeading =
			/\bdocx-heading\b/i.test(attributes) ||
			/^h[2-6]$/.test(tag) ||
			Boolean(numberedHeading);
		if (isHeading && numberedHeading) {
			body.push(`## ${numberedHeading[1]}. ${numberedHeading[2].trim()}`);
			sawSection = true;
			continue;
		}

		if (tag === "li") {
			body.push(`- ${text}`);
			continue;
		}
		if (!sawSection && INLINE_METADATA_RE.test(text)) continue;
		body.push(text);
	}

	if (!title) {
		const firstBody = body.findIndex(
			(block) => !block.startsWith("## ") && !block.startsWith("- "),
		);
		if (firstBody >= 0) {
			title = body.splice(firstBody, 1)[0].replace(/\*\*/g, "");
		}
	}

	const metadataLines = metadata
		.filter((entry) => entry.label.trim() && entry.value.trim())
		.map((entry) => `- ${entry.label.trim()}: ${entry.value.trim()}`);

	return [
		DOCX_SNAPSHOT_MARKER,
		`# ${title || "Contract agreement"}`,
		metadataLines.join("\n"),
		...body,
	]
		.filter(Boolean)
		.join("\n\n")
		.trim()
		.concat("\n");
}

export async function negotiationSnapshotFromDocx(
	docx: Buffer,
	metadata: NegotiationSnapshotMetadata[],
): Promise<string> {
	const html = await docxBufferToHtml(docx);
	return negotiationSnapshotFromHtml(html, metadata);
}
