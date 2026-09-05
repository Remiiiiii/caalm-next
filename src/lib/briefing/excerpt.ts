const EXCERPT_WORDS = 20;

/** Strip tags so RSS HTML descriptions become readable words. */
export function htmlToPlainText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
			String.fromCharCode(Number.parseInt(hex, 16)),
		)
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCharCode(Number.parseInt(code, 10)),
		)
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

/** First N words of body text; add ... only when there is more. */
export function excerptWords(
	text: string,
	count = EXCERPT_WORDS,
): string {
	const cleaned = htmlToPlainText(text)
		.replace(/View Full Coverage on Google News/gi, "")
		.replace(/\s+/g, " ")
		.trim();
	const words = cleaned.split(" ").filter(Boolean);
	if (words.length === 0) return "";
	if (words.length <= count) return words.join(" ");
	return `${words.slice(0, count).join(" ")}...`;
}
