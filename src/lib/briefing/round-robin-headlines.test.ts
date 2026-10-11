import { describe, expect, it } from "vitest";
import type { BriefingNewsItem } from "@/types/briefing";
import { roundRobinHeadlines } from "./fetch-briefing";

function item(
	feed: BriefingNewsItem["feed"],
	title: string,
	publishedAt: string,
): BriefingNewsItem {
	return {
		id: `${feed}-${title}`,
		title,
		source: feed === "bbc" ? "BBC News" : "The Guardian",
		feed,
		publishedAt,
		imageUrl: null,
		videoUrl: null,
		excerpt: null,
		articleUrl: null,
	};
}

describe("roundRobinHeadlines", () => {
	it("alternates feeds instead of taking the two newest from one outlet", () => {
		const picked = roundRobinHeadlines(
			[
				item("bbc", "BBC newest", "2026-10-10T12:00:00.000Z"),
				item("bbc", "BBC second", "2026-10-10T11:00:00.000Z"),
				item("google", "Guardian older", "2026-10-10T10:00:00.000Z"),
			],
			2,
		);
		expect(picked.map((n) => n.feed)).toEqual(["bbc", "google"]);
		expect(picked.map((n) => n.title)).toEqual([
			"BBC newest",
			"Guardian older",
		]);
	});

	it("fills from the remaining feed when one side is empty", () => {
		const picked = roundRobinHeadlines(
			[
				item("bbc", "One", "2026-10-10T12:00:00.000Z"),
				item("bbc", "Two", "2026-10-10T11:00:00.000Z"),
			],
			2,
		);
		expect(picked.map((n) => n.feed)).toEqual(["bbc", "bbc"]);
	});
});
