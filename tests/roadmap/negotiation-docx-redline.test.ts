import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import {
	applyPlainTextReplacementInDocx,
	applyRedlineToDocx,
} from "@/lib/contracts/negotiation/docx-redline";

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
	const xml = zip.file("word/document.xml")?.asText() || "";
	return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
		.map((m) => m[1])
		.join("");
}

describe("applyPlainTextReplacementInDocx", () => {
	it("replaces text split across runs without dropping surrounding paragraphs", () => {
		const docx = minimalDocx(
			`<w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:t>world</w:t></w:r></w:p>
<w:p><w:r><w:t>Keep me</w:t></w:r></w:p>`,
		);
		const next = applyPlainTextReplacementInDocx(
			docx,
			"Hello world",
			"Hi earth",
		);
		const text = documentText(next);
		expect(text).toContain("Hi earth");
		expect(text).toContain("Keep me");
		expect(text).not.toContain("Hello");
		expect(text).not.toContain("world");
	});

	it("applies a negotiation redline using snapshot anchors", () => {
		const extracted = "Prefix. OLD TERMS HERE. Suffix.";
		const start = extracted.indexOf("OLD TERMS HERE");
		const end = start + "OLD TERMS HERE".length;
		const docx = minimalDocx(
			`<w:p><w:r><w:t>Prefix. OLD TERMS HERE. Suffix.</w:t></w:r></w:p>`,
		);
		const next = applyRedlineToDocx(docx, extracted, {
			anchorStart: start,
			anchorEnd: end,
			redlineProposal: "NEW ADDITIONAL TERMS",
		});
		expect(documentText(next)).toContain("NEW ADDITIONAL TERMS");
		expect(documentText(next)).not.toContain("OLD TERMS HERE");
	});

	it("finds DOCX text when the snapshot anchor includes **bold** markers", () => {
		const extracted = "Effective Date: **2026-09-07**.";
		const start = extracted.indexOf("**2026-09-07**");
		const end = start + "**2026-09-07**".length;
		const docx = minimalDocx(
			`<w:p><w:r><w:t>Effective Date: 2026-09-07.</w:t></w:r></w:p>`,
		);
		const next = applyRedlineToDocx(docx, extracted, {
			anchorStart: start,
			anchorEnd: end,
			redlineProposal: "2026-09-10",
		});
		expect(documentText(next)).toContain("2026-09-10");
		expect(documentText(next)).not.toContain("2026-09-07");
	});
});
