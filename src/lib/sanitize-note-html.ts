const ALLOWED_TAGS = new Set([
	"p",
	"br",
	"strong",
	"b",
	"em",
	"i",
	"u",
	"s",
	"strike",
	"h1",
	"h2",
	"h3",
	"ul",
	"ol",
	"li",
	"a",
]);

const ALLOWED_ATTR = new Set(["href", "target", "rel"]);

/**
 * Strip unsafe tags from note HTML so lists stay visible without running scripts.
 * Works in tests and the browser without loading jsdom at module init.
 */
export function sanitizeNoteHtml(html: string): string {
	if (!html) return "";

	const withoutScripts = html
		.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
		.replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
		.replace(/javascript:/gi, "");

	if (typeof DOMParser === "undefined") {
		return withoutScripts;
	}

	const doc = new DOMParser().parseFromString(withoutScripts, "text/html");
	walk(doc.body);
	return doc.body.innerHTML;
}

function walk(node: Node): void {
	const children = Array.from(node.childNodes);
	for (const child of children) {
		if (child.nodeType === 1) {
			const el = child as Element;
			const tag = el.tagName.toLowerCase();
			if (!ALLOWED_TAGS.has(tag)) {
				const parent = el.parentNode;
				if (parent) {
					while (el.firstChild) {
						parent.insertBefore(el.firstChild, el);
					}
					parent.removeChild(el);
				}
				continue;
			}
			for (const attr of Array.from(el.attributes)) {
				if (!ALLOWED_ATTR.has(attr.name.toLowerCase())) {
					el.removeAttribute(attr.name);
				}
			}
			if (tag === "a") {
				const href = el.getAttribute("href") || "";
				if (!href.startsWith("http") && !href.startsWith("/")) {
					el.removeAttribute("href");
				}
				el.setAttribute("rel", "noopener noreferrer");
			}
			walk(el);
		}
	}
}
