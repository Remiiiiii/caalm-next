import { describe, expect, it } from "vitest";
import {
	formatAssistantMarkdown,
	formatInlineMarkdown,
	parseAssistantMarkdown,
	parseSoleMarkdownLink,
	plainTextForPaste,
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

	it("renders italic emphasis", () => {
		const html = formatInlineMarkdown('*"Corrective action complete"*');
		expect(html).toContain("<em");
		expect(html).not.toContain("*Corrective");
	});
});

describe("blockquote parsing", () => {
	it("parses blockquote lines without raw greater-than", () => {
		const blocks = parseAssistantMarkdown('> *"note"*\n\nNext para.');
		expect(blocks[0]).toMatchObject({ type: "blockquote" });
		const html = formatAssistantMarkdown('> *"note"*');
		expect(html).toContain("blockquote");
		expect(html).not.toContain("&gt;");
	});
});

describe("plainTextForPaste", () => {
	it("strips emphasis and quote wrappers", () => {
		expect(
			plainTextForPaste(
				'*"Corrective action for finding 2026-006 has been fully implemented."*',
			),
		).toBe(
			"Corrective action for finding 2026-006 has been fully implemented.",
		);
	});
});
