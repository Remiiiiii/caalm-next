import { describe, expect, it } from "vitest";
import {
	isArticleVisibleToAudience,
	isEligibleForScheduledPublish,
} from "@/lib/news/audience";

const now = new Date("2026-10-07T12:00:00.000Z");

describe("news audience filter", () => {
	it("hides drafts from readers", () => {
		expect(
			isArticleVisibleToAudience(
				{ status: "draft", departments: [] },
				{ now },
			),
		).toBe(false);
	});

	it("shows published org-wide articles", () => {
		expect(
			isArticleVisibleToAudience(
				{ status: "published", publishAt: "2026-10-01T00:00:00.000Z" },
				{ now },
			),
		).toBe(true);
	});

	it("hides future publishAt", () => {
		expect(
			isArticleVisibleToAudience(
				{ status: "published", publishAt: "2026-10-08T00:00:00.000Z" },
				{ now },
			),
		).toBe(false);
	});

	it("matches department targeting", () => {
		expect(
			isArticleVisibleToAudience(
				{ status: "published", departments: ["IT"] },
				{ now, department: "IT" },
			),
		).toBe(true);
		expect(
			isArticleVisibleToAudience(
				{ status: "published", departments: ["IT"] },
				{ now, department: "HR" },
			),
		).toBe(false);
	});

	it("matches role targeting", () => {
		expect(
			isArticleVisibleToAudience(
				{ status: "published", roles: ["Content Creator"] },
				{ now, roleNames: ["Content Creator"] },
			),
		).toBe(true);
		expect(
			isArticleVisibleToAudience(
				{ status: "published", roles: ["Content Creator"] },
				{ now, roleNames: ["Employee"] },
			),
		).toBe(false);
	});
});

describe("scheduled publish eligibility", () => {
	it("publishes scheduled articles whose time has passed", () => {
		expect(
			isEligibleForScheduledPublish(
				{ status: "scheduled", publishAt: "2026-10-07T11:00:00.000Z" },
				now,
			),
		).toBe(true);
	});

	it("keeps future scheduled articles unpublished", () => {
		expect(
			isEligibleForScheduledPublish(
				{ status: "scheduled", publishAt: "2026-10-08T11:00:00.000Z" },
				now,
			),
		).toBe(false);
	});
});
