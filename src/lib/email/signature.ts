/**
 * Helpers for mapping provider email signatures into CAALM compose/send.
 * Gmail exposes HTML via sendAs; Outlook has no Graph signature API, so we
 * infer from recent Sent Items (including inline cid: images → data URLs).
 */

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Turn plain compose text into HTML paragraphs/breaks. */
export function plainTextToHtml(text: string): string {
	const trimmed = text.replace(/\r\n/g, "\n");
	if (!trimmed.trim()) return "";
	return escapeHtml(trimmed).replace(/\n/g, "<br>\n");
}

/** Strip obvious script/handler vectors before previewing signature HTML. */
export function sanitizeSignatureHtml(html: string): string {
	return html
		.replace(/<script\b[\s\S]*?<\/script>/gi, "")
		.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
		.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
		.replace(/javascript:/gi, "");
}

/**
 * Combine the user's typed body with provider signature HTML for send/draft.
 * Returns HTML when a signature is present; otherwise plain text.
 */
export function combineBodyWithSignature(
	plainBody: string,
	signatureHtml: string | null | undefined,
): { body: string; contentType: "text" | "html" } {
	const sig = (signatureHtml || "").trim();
	if (!sig) {
		return { body: plainBody, contentType: "text" };
	}
	const bodyHtml = plainTextToHtml(plainBody);
	const safeSig = sanitizeSignatureHtml(sig);
	const combined = bodyHtml
		? `${bodyHtml}<br><br>${safeSig}`
		: safeSig;
	return { body: combined, contentType: "html" };
}

type OutlookAttachment = {
	contentId?: string;
	contentBytes?: string;
	contentType?: string;
	name?: string;
};

/**
 * Pull Outlook's common `#Signature` block from a sent HTML body and rewrite
 * cid: images to data URLs using message attachments.
 */
export function extractOutlookSignatureFromHtml(
	html: string,
	attachments: OutlookAttachment[] = [],
): string | null {
	const source = (html || "").trim();
	if (!source) return null;

	const idMatch =
		source.match(
			/<div[^>]*\bid\s*=\s*["']Signature["'][^>]*>[\s\S]*?<\/div>/i,
		) ||
		source.match(
			/<table[^>]*\bid\s*=\s*["']Signature["'][^>]*>[\s\S]*?<\/table>/i,
		);

	let signatureHtml = idMatch?.[0] || null;

	if (!signatureHtml) {
		// Fallback: content after a classic signature delimiter
		const delim = source.split(/<div[^>]*>--\s*<\/div>|<p>--\s*<\/p>|^--\s*$/im);
		if (delim.length > 1) {
			signatureHtml = delim.slice(1).join("").trim();
		}
	}

	if (!signatureHtml?.trim()) return null;

	const byCid = new Map<string, OutlookAttachment>();
	for (const att of attachments) {
		const cid = (att.contentId || "").replace(/^<|>$/g, "").trim();
		if (cid) byCid.set(cid.toLowerCase(), att);
	}

	const withImages = signatureHtml.replace(
		/<img\b([^>]*?)\bsrc\s*=\s*["']cid:([^"']+)["']([^>]*)>/gi,
		(full, pre, cid, post) => {
			const att = byCid.get(String(cid).toLowerCase());
			if (!att?.contentBytes) return full;
			const mime = att.contentType || "image/png";
			return `<img${pre}src="data:${mime};base64,${att.contentBytes}"${post}>`;
		},
	);

	return sanitizeSignatureHtml(withImages);
}
