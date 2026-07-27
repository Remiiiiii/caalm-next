const ALLOWED_TAGS = [
	"p",
	"br",
	"strong",
	"em",
	"u",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"ul",
	"ol",
	"li",
	"a",
];

const ALLOWED_ATTR = ["href", "target"];

/**
 * Sanitize news HTML content.
 * Dynamic import keeps isomorphic-dompurify/jsdom off GET route module load
 * (jsdom fails on Vercel serverless with ERR_REQUIRE_ESM).
 */
export async function sanitizeNewsHtml(content: string): Promise<string> {
	const { default: DOMPurify } = await import("isomorphic-dompurify");
	return DOMPurify.sanitize(content, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
	});
}
