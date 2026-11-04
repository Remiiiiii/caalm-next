import { describe, expect, it } from "vitest";
import {
	formatAssistantMarkdown,
	formatInlineMarkdown,
	parseAssistantMarkdown,
	parseSoleMarkdownLink,
} from "./formatMarkdown";

describe("parseAssistantMarkdown", () => {
	it("splits headings, lists, and paragraphs", () => {
		const blocks = parseAssistantMarkdown(
			"## Plan\nDo this first.\n\n1. Start the action\n2. Upload evidence",
		);
		expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list"]);
	});

	it("captures a fenced code block", () => {
		const blocks = parseAssistantMarkdown("```ts\nconst x = 1;\n```");
		expect(blocks[0]).toMatchObject({ type: "code", language: "ts" });
	});
});

describe("formatAssistantMarkdown", () => {
	it("renders bold and lists", () => {
		const html = formatAssistantMarkdown("**Hello**\n\n- one\n- two");
		expect(html).toContain("<strong");
		expect(html).toContain("<ul");
	});
});

describe("parseSoleMarkdownLink", () => {
	it("parses a sole markdown link", () => {
		expect(
			parseSoleMarkdownLink(
				"[Open finding in CAALM](/audits/upload/doc#finding-cap-1)",
			),
		).toEqual({
			label: "Open finding in CAALM",
			href: "/audits/upload/doc#finding-cap-1",
		});
	});

	it("rejects non-link paragraphs", () => {
		expect(parseSoleMarkdownLink("See the finding above.")).toBeNull();
	});
});

describe("formatInlineMarkdown", () => {
	it("renders markdown links as anchors", () => {
		const html = formatInlineMarkdown("[Open](/audits/upload/1)");
		expect(html).toContain('href="/audits/upload/1"');
		expect(html).toContain(">Open</a>");
	});
});
