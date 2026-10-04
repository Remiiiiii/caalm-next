import { describe, expect, it } from "vitest";
import {
	combineBodyWithSignature,
	escapeHtml,
	extractOutlookSignatureFromHtml,
	plainTextToHtml,
	sanitizeSignatureHtml,
} from "@/lib/email/signature";

describe("email signature helpers", () => {
	it("escapes HTML and converts newlines", () => {
		expect(escapeHtml(`a <b> & "c"`)).toBe("a &lt;b&gt; &amp; &quot;c&quot;");
		expect(plainTextToHtml("Hi\nThere")).toBe("Hi<br>\nThere");
	});

	it("combines plain body with signature as HTML", () => {
		const result = combineBodyWithSignature("Hello", "<div>Sig <img src=\"x.png\"></div>");
		expect(result.contentType).toBe("html");
		expect(result.body).toContain("Hello");
		expect(result.body).toContain("Sig");
		expect(result.body).toContain("<img");
	});

	it("keeps plain text when no signature", () => {
		expect(combineBodyWithSignature("Hello", null)).toEqual({
			body: "Hello",
			contentType: "text",
		});
	});

	it("strips script tags from signature HTML", () => {
		expect(
			sanitizeSignatureHtml('<div>Hi</div><script>alert(1)</script>'),
		).toBe("<div>Hi</div>");
	});

	it("extracts Outlook #Signature and inlines cid images", () => {
		const html = `
			<div>Body</div>
			<div id="Signature">Thanks<br><img src="cid:logo@cid" alt="Logo"></div>
		`;
		const signature = extractOutlookSignatureFromHtml(html, [
			{
				contentId: "logo@cid",
				contentBytes: "abc123",
				contentType: "image/png",
			},
		]);
		expect(signature).toContain('id="Signature"');
		expect(signature).toContain("data:image/png;base64,abc123");
		expect(signature).not.toContain("cid:");
	});
});
