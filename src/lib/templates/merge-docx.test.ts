import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { mergeBlueprintDocument, mergeDocxTemplate } from "./merge-docx";

function minimalDocx(bodyText: string): Buffer {
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
  <w:body><w:p><w:r><w:t>${bodyText}</w:t></w:r></w:p></w:body>
</w:document>`,
	);
	return zip.generate({ type: "nodebuffer" });
}

function documentText(docx: Buffer): string {
	const zip = new PizZip(docx);
	return zip.file("word/document.xml")?.asText() || "";
}

describe("mergeDocxTemplate", () => {
	it("replaces fill tokens and leaves signature locks in place", () => {
		const template = minimalDocx(
			"Hello {{VENDOR_NAME}} hash {{VENDOR_SIGNATURE_HASH}}",
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

	it("appends custom and injected language after the merge", () => {
		const template = minimalDocx("Party {{VENDOR_NAME}}");
		const merged = mergeBlueprintDocument({
			template,
			tokenValues: { VENDOR_NAME: "Acme Corp" },
			customBlocks: [{ id: "c1", body: "Extra indemnity paragraph." }],
			injectedBodies: ["Confidentiality from the clause library."],
		});
		const xml = documentText(merged);
		expect(xml).toContain("Acme Corp");
		expect(xml).toContain("Extra indemnity paragraph.");
		expect(xml).toContain("Confidentiality from the clause library.");
	});

	it("fills org letterhead tokens and can keep other placeholders", () => {
		const template = minimalDocx("{{org_name}} / {{VENDOR_NAME}}");
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
		const template = minimalDocx("{{CLIENT_NAME}}");
		const zip = new PizZip(template);
		expect(() => new Docxtemplater(zip, { delimiters: { start: "{{", end: "}}" } })).not.toThrow();
	});
});
