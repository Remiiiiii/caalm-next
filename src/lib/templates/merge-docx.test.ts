import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import {
	appendParagraphsToDocx,
	buildAdditionalTermsBlocks,
	buildSupplementalDocumentBlocks,
	findSignaturesParagraphIndex,
	findSupplementalInsertIndex,
	isHorizontalRuleParagraph,
	maxNumberedHeading,
	mergeBlueprintDocument,
	mergeDocxTemplate,
	normalizeBodyColors,
	normalizeBodyFonts,
	stripEmptyListParagraphs,
	stripRemainingMergeTokens,
} from "./merge-docx";

function minimalDocx(bodyInnerXml: string): Buffer {
	const zip = new PizZip();
	zip.file(
		"[Content_Types].xml",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
	);
	zip.file(
		"_rels/.rels",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
	);
	zip.file(
		"word/_rels/document.xml.rels",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
	);
	zip.file(
		"word/document.xml",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyInnerXml}</w:body>
</w:document>`,
	);
	return zip.generate({ type: "nodebuffer" });
}

function documentText(docx: Buffer): string {
	const zip = new PizZip(docx);
	return zip.file("word/document.xml")?.asText() || "";
}

function p(text: string, bold = false, color?: string, font?: string): string {
	const colorTag = color ? `<w:color w:val="${color}"/>` : "";
	const fontTag = font
		? `<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>`
		: "";
	const rPr =
		bold || color || font
			? `<w:rPr>${bold ? "<w:b/>" : ""}${colorTag}${fontTag}</w:rPr>`
			: "";
	return `<w:p><w:r>${rPr}<w:t>${text}</w:t></w:r></w:p>`;
}

describe("mergeDocxTemplate", () => {
	it("replaces fill tokens and leaves signature locks in place", () => {
		const template = minimalDocx(
			p("Hello {{VENDOR_NAME}} hash {{VENDOR_SIGNATURE_HASH}}"),
		);
		const merged = mergeDocxTemplate(template, {
			VENDOR_NAME: "Acme Corp",
			VENDOR_SIGNATURE_HASH: "should-not-apply",
		});
		const xml = documentText(merged);
		expect(xml).toContain("Acme Corp");
		expect(xml).toContain("{{VENDOR_SIGNATURE_HASH}}");
		expect(xml).not.toContain("should-not-apply");
	});

	it("inserts clauses and additional terms as separate numbered sections", () => {
		const ruleParagraph =
			`<w:p><w:pPr><w:pBdr><w:bottom w:color="1b2a4a" w:space="0" w:sz="6" w:val="single"/></w:pBdr></w:pPr><w:r><w:t></w:t></w:r></w:p>`;
		const template = minimalDocx(
			[
				p("9. DISPUTES", true),
				p("Dispute body."),
				ruleParagraph,
				p("DIGITAL SIGNATURES &amp; EXECUTION", true),
				p("Sign here."),
			].join(""),
		);
		const merged = mergeBlueprintDocument({
			template,
			tokenValues: {},
			customBlocks: [{ id: "c1", body: "Extra indemnity paragraph." }],
			injectedClauses: [
				{
					title: "Confidentiality",
					body: "Confidentiality from the clause library.",
				},
			],
		});
		const xml = documentText(merged);
		expect(xml).toContain("10. CLAUSES");
		expect(xml).toContain("Confidentiality");
		expect(xml).toContain("Confidentiality from the clause library.");
		expect(xml).toContain("11. ADDITIONAL TERMS");
		expect(xml).toContain("Extra indemnity paragraph.");

		const disputesBodyAt = xml.indexOf("Dispute body.");
		const clausesAt = xml.indexOf("10. CLAUSES");
		const ruleAt = xml.indexOf('w:bottom w:color="1b2a4a"');
		const signaturesAt = xml.indexOf("DIGITAL SIGNATURES");
		expect(disputesBodyAt).toBeGreaterThanOrEqual(0);
		expect(clausesAt).toBeGreaterThan(disputesBodyAt);
		expect(ruleAt).toBeGreaterThan(clausesAt);
		expect(signaturesAt).toBeGreaterThan(ruleAt);
	});

	it("detects blueprint horizontal rule paragraphs before signatures", () => {
		const rule =
			`<w:p><w:pPr><w:pBdr><w:bottom w:val="single"/></w:pBdr></w:pPr><w:r><w:t></w:t></w:r></w:p>`;
		expect(isHorizontalRuleParagraph(rule)).toBe(true);
		expect(isHorizontalRuleParagraph(p("9. DISPUTES", true))).toBe(false);

		const xml = [
			p("Dispute body."),
			rule,
			p("DIGITAL SIGNATURES & EXECUTION", true),
		].join("");
		const insertAt = findSupplementalInsertIndex(xml);
		expect(insertAt).toBe(xml.indexOf(rule));
		expect(insertAt).toBeLessThan(xml.indexOf("DIGITAL SIGNATURES"));
	});

	it("revamps the signature section for blueprint merges", () => {
		const template = minimalDocx(
			[
				p("9. DISPUTES", true),
				p("Dispute body."),
				p("DIGITAL SIGNATURES &amp; EXECUTION", true),
				p("Legacy signature copy."),
			].join(""),
		);
		const merged = mergeBlueprintDocument({
			template,
			tokenValues: {},
			blueprintId: "government",
			forPreview: true,
		});
		const xml = documentText(merged);
		expect(xml).toContain("GOVERNMENT AGENCY");
		expect(xml).toContain("DIGITAL SIGNATURE RECORD");
		expect(xml).not.toContain("Legacy signature copy.");
		expect(xml).not.toContain("DIGITAL SIGNATURES &amp; EXECUTION");
	});

	it("fills org letterhead tokens and can keep other placeholders", () => {
		const template = minimalDocx(p("{{org_name}} / {{VENDOR_NAME}}"));
		const merged = mergeDocxTemplate(
			template,
			{ org_name: "CFCE" },
			{ keepMissing: true },
		);
		const xml = documentText(merged);
		expect(xml).toContain("CFCE");
		expect(xml).toContain("{{VENDOR_NAME}}");
	});

	it("round-trips a docxtemplater document", () => {
		const template = minimalDocx(p("{{CLIENT_NAME}}"));
		const zip = new PizZip(template);
		expect(() =>
			new Docxtemplater(zip, { delimiters: { start: "{{", end: "}}" } }),
		).not.toThrow();
	});

	it("preview mode blanks signature locks and strips placeholder colors", () => {
		const template = minimalDocx(
			[
				p("Effective Date: {{EFFECTIVE_DATE}}", false, "8A2A00", "Consolas"),
				p("Hash {{VENDOR_SIGNATURE_HASH}}", false, "8A2A00", "Consolas"),
			].join(""),
		);
		const merged = mergeDocxTemplate(
			template,
			{ EFFECTIVE_DATE: "2026-08-30" },
			{ forPreview: true },
		);
		const xml = documentText(merged);
		expect(xml).toContain("2026-08-30");
		expect(xml).not.toContain("{{VENDOR_SIGNATURE_HASH}}");
		expect(xml).not.toContain("8A2A00");
		expect(xml).not.toContain("Consolas");
		expect(xml).toContain("Times New Roman");
	});
});

describe("additional terms helpers", () => {
	it("reads the highest numbered heading from paragraph text", () => {
		const xml = [
			p("8. TERMINATION", true),
			p("9. DISPUTES", true),
			p("DIGITAL SIGNATURES & EXECUTION", true),
		].join("");
		expect(maxNumberedHeading(xml)).toBe(9);
		const signaturesAt = findSignaturesParagraphIndex(xml);
		expect(signaturesAt).not.toBeNull();
		expect(xml.slice(signaturesAt!).startsWith("<w:p>")).toBe(true);
		expect(xml.slice(signaturesAt!)).toContain("DIGITAL SIGNATURES");
	});

	it("builds a branded numbered heading block", () => {
		const sourceXml = [
			p("9. DISPUTES", true, "0F5384"),
			p("Dispute body text here."),
		].join("");
		const blocks = buildAdditionalTermsBlocks(
			["Title line", "Body\n\nSecond paragraph."],
			10,
			sourceXml,
		);
		expect(blocks).toContain("10. ADDITIONAL TERMS");
		expect(blocks).toContain("0F5384");
		expect(blocks).toContain("Title line");
		expect(blocks).toContain("Second paragraph.");
	});

	it("builds clause section with subheadings before additional terms", () => {
		const sourceXml = [
			p("9. DISPUTES", true, "0F5384"),
			`<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="CBD5E1"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="0F5384"/></w:rPr><w:t>9. DISPUTES</w:t></w:r></w:p>`,
		].join("");
		const blocks = buildSupplementalDocumentBlocks({
			startNumber: 10,
			sourceXml,
			injectedClauses: [
				{ title: "Payment", body: "Net 30 terms." },
				{ title: "Confidentiality", body: "Mutual NDA." },
			],
			customBlockBodies: ["Custom paragraph."],
		});
		expect(blocks).toContain("10. CLAUSES");
		expect(blocks).toContain("Payment");
		expect(blocks).toContain("Confidentiality");
		expect(blocks).toContain("11. ADDITIONAL TERMS");
		expect(blocks).toContain("Custom paragraph.");
		expect(blocks).not.toContain("CBD5E1");
		expect(blocks).not.toContain("pBdr");
	});

	it("normalizes body colors while keeping section heading blue", () => {
		const xml = p("Value", false, "8A2A00") + p("9. HEADING", true, "0F5384");
		const next = normalizeBodyColors(xml);
		expect(next).not.toContain("8A2A00");
		expect(next).toContain("0F5384");
	});

	it("normalizes placeholder fonts to the document body font", () => {
		const xml =
			p("Body text.", false, undefined, "Times New Roman") +
			p("Token value", false, undefined, "Consolas");
		const next = normalizeBodyFonts(xml);
		expect(next).not.toContain("Consolas");
		expect(next).toContain("Times New Roman");
	});

	it("strips remaining merge tokens from preview xml", () => {
		const xml = p("Hash {{GOVERNMENT_AGENCY_SIGNATURE_HASH}}");
		expect(stripRemainingMergeTokens(xml)).not.toContain("{{");
	});

	it("skips append when there is nothing to add", () => {
		const template = minimalDocx(p("Body only."));
		const next = appendParagraphsToDocx(template, ["  ", ""]);
		expect(documentText(next)).toBe(documentText(template));
	});

	it("drops empty list paragraphs after a blank token merge", () => {
		const xml = [
			`<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t></w:t></w:r></w:p>`,
			`<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Keep me</w:t></w:r></w:p>`,
		].join("");
		const next = stripEmptyListParagraphs(xml);
		expect(next).toContain("Keep me");
		expect(next.match(/<w:p\b/g)?.length).toBe(1);
	});
});
