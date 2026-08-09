import { describe, expect, it } from "vitest";
import { extractHeadings, parseMarkdown, stripMarkdown } from "@/lib/docs/markdown";
import { searchDocs } from "@/lib/docs/search";
import { flattenDocsNav } from "@/lib/docs/navigation";

describe("docs markdown", () => {
	it("parses headings, lists, callouts, and tables", () => {
		const md = `# Title

Intro paragraph.

## Section One

- alpha
- beta

> [!TIP]
> Do the simple thing first.

| Key | Meaning |
|---|---|
| contracts.view | See contracts |
`;
		const blocks = parseMarkdown(md);
		expect(blocks.some((b) => b.type === "h1")).toBe(true);
		expect(blocks.some((b) => b.type === "h2")).toBe(true);
		expect(blocks.some((b) => b.type === "ul")).toBe(true);
		expect(blocks.some((b) => b.type === "callout")).toBe(true);
		expect(blocks.some((b) => b.type === "table")).toBe(true);
		expect(extractHeadings(md).map((h) => h.id)).toContain("section-one");
	});

	it("strips markdown for search text", () => {
		const text = stripMarkdown("**Hello** [world](/docs)\n\n```\ncode\n```");
		expect(text.toLowerCase()).toContain("hello");
		expect(text.toLowerCase()).toContain("world");
		expect(text).not.toContain("```");
	});
});

describe("docs search", () => {
	it("ranks title matches above body matches", () => {
		const hits = searchDocs(
			[
				{
					slug: "a",
					title: "Contracts",
					description: "Agreement records",
					section: "reference",
					text: "upload renew approve",
				},
				{
					slug: "b",
					title: "Calendar",
					description: "Events",
					section: "reference",
					text: "contracts can appear on calendars when dates are set",
				},
			],
			"contracts",
			5,
		);
		expect(hits[0]?.slug).toBe("a");
	});
});

describe("docs navigation", () => {
	it("has unique slugs for every page", () => {
		const slugs = flattenDocsNav().map((i) => i.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(slugs.length).toBeGreaterThan(40);
	});
});
