import { describe, expect, it } from "vitest";
import {
	filterNewIngestItems,
	ingestDedupeKey,
} from "@/lib/news/ingest/dedupe";
import { sanitizeIngestItem } from "@/lib/news/ingest/sanitize-import";

describe("ingest dedupe", () => {
	it("skips items already seen for the org and feed", () => {
		const existing = new Set([
			ingestDedupeKey({
				orgId: "org1",
				sourceFeedId: "feed1",
				externalId: "ext-1",
			}),
		]);
		const next = filterNewIngestItems(
			[
				{
					externalId: "ext-1",
					title: "Old",
					excerpt: "Old",
					canonicalUrl: "https://example.com/old",
				},
				{
					externalId: "ext-2",
					title: "New",
					excerpt: "New",
					canonicalUrl: "https://example.com/new",
				},
			],
			existing,
			"org1",
			"feed1",
		);
		expect(next.map((item) => item.externalId)).toEqual(["ext-2"]);
	});
});

describe("import sanitizer", () => {
	it("strips scripts and requires an http URL", () => {
		const clean = sanitizeIngestItem({
			externalId: "1",
			title: "Alert <script>alert(1)</script>",
			excerpt: "<p>Stay home</p><script>bad()</script>",
			canonicalUrl: "https://example.com/alert",
		});
		expect(clean?.title).toBe("Alert");
		expect(clean?.excerpt).toBe("Stay home");
		expect(
			sanitizeIngestItem({
				externalId: "2",
				title: "Nope",
				excerpt: "Nope",
				canonicalUrl: "javascript:alert(1)",
			}),
		).toBeNull();
	});
});
