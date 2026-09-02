import { describe, expect, it } from "vitest";
import {
	isMixedNewsOutlets,
	newsHeaderLinks,
	showGoogleNewsCardLink,
} from "./news-header-links";
import type { BriefingNewsItem } from "@/types/briefing";

function item(
	feed: BriefingNewsItem["feed"],
	source: string,
): BriefingNewsItem {
	return {
		id: `${feed}-${source}`,
		title: "Headline",
		source,
		feed,
		publishedAt: "",
		imageUrl: null,
		videoUrl: null,
		excerpt: null,
		articleUrl: null,
	};
}

describe("news header links", () => {
	it("sends See news to BBC and puts Google News above the Guardian card", () => {
		const mixed = [
			item("bbc", "BBC News"),
			item("google", "The Guardian"),
		];
		expect(isMixedNewsOutlets(mixed)).toBe(true);
		expect(newsHeaderLinks(mixed)[0]?.href).toContain("bbc.com");
		expect(showGoogleNewsCardLink(mixed, mixed[0]!)).toBe(false);
		expect(showGoogleNewsCardLink(mixed, mixed[1]!)).toBe(true);
	});

	it("still treats a BBC story from the Google News feed as BBC", () => {
		const mixed = [
			item("google", "BBC News"),
			item("google", "The Guardian"),
		];
		expect(newsHeaderLinks(mixed)[0]?.href).toContain("bbc.com");
		expect(showGoogleNewsCardLink(mixed, mixed[0]!)).toBe(false);
		expect(showGoogleNewsCardLink(mixed, mixed[1]!)).toBe(true);
	});

	it("shows one See news link when both cards are BBC", () => {
		const links = newsHeaderLinks([
			item("bbc", "BBC News"),
			item("bbc", "BBC News"),
		]);
		expect(links).toHaveLength(1);
		expect(links[0]?.href).toContain("bbc.com");
	});
});
