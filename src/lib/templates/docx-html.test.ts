import { describe, expect, it } from "vitest";
import { isLetterheadOrgPart, layoutDocxHtml } from "./docx-html.mjs";

describe("layoutDocxHtml letterhead", () => {
	it("places merged org lines beside the logo", () => {
		const html = [
			"<p><img src=\"logo.png\" /></p>",
			"<p>Caalm Solutions Inc.</p>",
			"<p>9802 SW 77th Ave</p>",
			"<p>Miami, FL 33156</p>",
			"<p>(305) 555-5555</p>",
			"<p>support@caalmsolutions.com</p>",
			"<p>caalmsolutions.com</p>",
			"<p><strong>GOVERNMENT CONTRACT</strong></p>",
		].join("");

		const laidOut = layoutDocxHtml(html);
		expect(laidOut).toContain('class="docx-letterhead"');
		expect(laidOut).toContain('class="docx-letterhead-logo"');
		expect(laidOut).toContain('class="docx-letterhead-org"');
		expect(laidOut).toContain("Caalm Solutions Inc.");
		expect(laidOut).toContain("support@caalmsolutions.com");
		expect(laidOut).not.toMatch(/<\/div>\s*<p>Caalm Solutions Inc/);
	});

	it("groups mammoth merged org lines beside the logo", () => {
		const mergedOrg =
			"<p>Caalm Solutions Inc.<br />9802 SW 77th Ave<br />Miami, FL 33156<br />(305) 555-5555<br />support@caalmsolutions.com<br />caalmsolutions.com</p>";
		const html = [
			"<p><img src=\"logo.png\" /></p>",
			mergedOrg,
			"<p><strong>VENDOR / SERVICE AGREEMENT</strong></p>",
		].join("");

		const laidOut = layoutDocxHtml(html);
		expect(isLetterheadOrgPart(mergedOrg)).toBe(true);
		expect(laidOut).toContain('class="docx-letterhead"');
		expect(laidOut).toContain("Caalm Solutions Inc.");
		expect(laidOut).toContain("Miami, FL 33156");
		expect(laidOut).toContain("caalmsolutions.com");
		expect(laidOut).not.toMatch(/<\/div>\s*<p>Caalm Solutions Inc/);
	});

	it("splits multiline org_address values in the letterhead block", () => {
		const html = [
			"<p><img src=\"logo.png\" /></p>",
			"<p>Caalm Solutions Inc.</p>",
			"<p>9802 SW 77th Ave\nMiami, FL 33156</p>",
			"<p>(305) 555-5555</p>",
			"<p><strong>VENDOR AGREEMENT</strong></p>",
		].join("");
		const laidOut = layoutDocxHtml(html);
		expect(laidOut).toContain("9802 SW 77th Ave");
		expect(laidOut).toContain("Miami, FL 33156");
		expect(laidOut).not.toContain("9802 SW 77th Ave\nMiami");
	});

	it("still groups unfilled org tokens", () => {
		const html = [
			"<p><img src=\"logo.png\" />{{org_name}}</p>",
			"<p>{{org_address}}</p>",
			"<p><strong>VENDOR AGREEMENT</strong></p>",
		].join("");

		const laidOut = layoutDocxHtml(html);
		expect(laidOut).toContain("docx-letterhead-org");
		expect(laidOut).toContain("docx-token");
	});
});

describe("isLetterheadOrgPart", () => {
	it("accepts short contact lines and rejects titles", () => {
		expect(isLetterheadOrgPart("<p>Caalm Solutions Inc.</p>")).toBe(true);
		expect(
			isLetterheadOrgPart("<p><strong>GOVERNMENT CONTRACT</strong></p>"),
		).toBe(false);
	});
});
