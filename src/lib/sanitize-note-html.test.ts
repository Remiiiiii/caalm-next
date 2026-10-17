import { describe, expect, it } from "vitest";
import { sanitizeNoteHtml } from "@/lib/sanitize-note-html";

describe("sanitizeNoteHtml", () => {
	it("keeps bullet and numbered lists", () => {
		const html =
			"<ul><li>First</li><li>Second</li></ul><ol><li>One</li></ol>";
		const clean = sanitizeNoteHtml(html);
		expect(clean).toContain("<ul>");
		expect(clean).toContain("<li>First</li>");
		expect(clean).toContain("<ol>");
		expect(clean).toContain("<li>One</li>");
	});

	it("removes scripts", () => {
		const clean = sanitizeNoteHtml(
			"<p>Safe</p><script>alert(1)</script><ul><li>Item</li></ul>",
		);
		expect(clean).toContain("Safe");
		expect(clean).toContain("<ul>");
		expect(clean).not.toContain("script");
		expect(clean).not.toContain("alert");
	});
});
