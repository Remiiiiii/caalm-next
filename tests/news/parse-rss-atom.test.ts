import { describe, expect, it } from "vitest";
import { parseRssOrAtom } from "@/lib/news/ingest/parse-rss-atom";
import { parseWordpressJson } from "@/lib/news/ingest/parse-wordpress";

describe("RSS/Atom parser", () => {
	it("parses RSS items into ingest shape", () => {
		const xml = `<?xml version="1.0"?>
<rss><channel>
<item>
<title>Office closed Friday</title>
<link>https://example.com/news/friday</link>
<guid>https://example.com/news/friday</guid>
<description>The office is closed this Friday.</description>
<pubDate>Tue, 07 Oct 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;
		const items = parseRssOrAtom(xml);
		expect(items).toHaveLength(1);
		expect(items[0].title).toBe("Office closed Friday");
		expect(items[0].canonicalUrl).toBe("https://example.com/news/friday");
		expect(items[0].excerpt).toContain("closed this Friday");
	});

	it("parses Atom entries", () => {
		const xml = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
<title>New parking policy</title>
<link href="https://example.com/atom/parking"/>
<id>urn:news:parking</id>
<summary>Use lot B starting Monday.</summary>
</entry>
</feed>`;
		const items = parseRssOrAtom(xml);
		expect(items[0].externalId).toBe("urn:news:parking");
		expect(items[0].canonicalUrl).toBe("https://example.com/atom/parking");
	});
});

describe("WordPress parser", () => {
	it("maps WP REST posts", () => {
		const items = parseWordpressJson([
			{
				id: 44,
				link: "https://blog.example.com/hello",
				title: { rendered: "Hello team" },
				excerpt: { rendered: "<p>Welcome aboard</p>" },
				date: "2026-10-07T00:00:00",
			},
		]);
		expect(items[0].title).toBe("Hello team");
		expect(items[0].excerpt).toBe("Welcome aboard");
		expect(items[0].externalId).toBe("44");
	});
});
