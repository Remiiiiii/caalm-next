import { describe, expect, it } from "vitest";
import { filterNewIngestItems } from "@/lib/news/ingest/dedupe";
import { parseRssOrAtom } from "@/lib/news/ingest/parse-rss-atom";
import { sanitizeIngestItem } from "@/lib/news/ingest/sanitize-import";

describe("ingest to review-queue flow", () => {
	it("parses, sanitizes, and leaves new items ready for pending_review", () => {
		const xml = `<rss><channel><item>
<title>Imported notice</title>
<link>https://intranet.example.com/n1</link>
<guid>n1</guid>
<description>Please review</description>
</item></channel></rss>`;
		const parsed = parseRssOrAtom(xml)
			.map(sanitizeIngestItem)
			.filter((item): item is NonNullable<typeof item> => Boolean(item));
		const fresh = filterNewIngestItems(parsed, new Set(), "org1", "feed1");
		expect(fresh).toHaveLength(1);
		expect(fresh[0].canonicalUrl).toBe("https://intranet.example.com/n1");
	});
});
