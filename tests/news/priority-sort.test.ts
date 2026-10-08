import { describe, expect, it } from "vitest";
import { toDisplayPriority, toStoredPriority } from "@/lib/news/priority";
import { sortNewsForFeed } from "@/lib/news/sort";

describe("news priority mapping", () => {
	it("maps medium and low to normal for readers", () => {
		expect(toDisplayPriority("high")).toBe("high");
		expect(toDisplayPriority("medium")).toBe("normal");
		expect(toDisplayPriority("low")).toBe("normal");
	});

	it("stores normal as medium", () => {
		expect(toStoredPriority("normal")).toBe("medium");
		expect(toStoredPriority("high")).toBe("high");
	});
});

describe("news feed sort", () => {
	it("puts pinned then high priority then newest", () => {
		const sorted = sortNewsForFeed([
			{
				$id: "a",
				pinned: false,
				priority: "low",
				publishedAt: "2026-10-07T12:00:00.000Z",
			},
			{
				$id: "b",
				pinned: true,
				priority: "medium",
				publishedAt: "2026-10-01T12:00:00.000Z",
			},
			{
				$id: "c",
				pinned: false,
				priority: "high",
				publishedAt: "2026-10-06T12:00:00.000Z",
			},
		]);
		expect(sorted.map((item) => item.$id)).toEqual(["b", "c", "a"]);
	});
});
