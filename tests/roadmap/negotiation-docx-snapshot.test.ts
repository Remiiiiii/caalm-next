import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import {
	buildClauseToc,
	isDocxNegotiationSnapshot,
	isThinNegotiationSnapshot,
	parseNegotiationDocument,
} from "@/lib/contracts/negotiation/document-model";
import { negotiationSnapshotFromHtml } from "@/lib/contracts/negotiation/docx-snapshot";
import { replaceNegotiationSectionsInDocx } from "@/lib/templates/merge-docx";

const GRANT_HTML = `
<div class="docx-letterhead">
  <div class="docx-letterhead-logo"><img src="logo.png"></div>
  <div class="docx-letterhead-org"><p>CAALM Solutions Inc.</p><p>Miami, FL 33156</p></div>
</div>
<p class="docx-title"><strong>GRANT AGREEMENT</strong></p>
<p>This Grant Agreement (<strong>"Agreement"</strong>) is entered into by
<strong>Acme Corporation</strong> (<strong>"Grantor"</strong>) and CAALM
Solutions LLC (<strong>"Grantee"</strong>).</p>
<p class="docx-heading"><strong>1. GRANT PURPOSE</strong></p>
<p><strong>Grantor</strong> shall provide the grant funds for the
<strong>Grant Purpose</strong>:</p>
<ul>
  <li>Expand outpatient behavioral health capacities</li>
  <li>Grant Funds may be used solely for the Grant Purpose</li>
</ul>
<p class="docx-heading"><strong>2. GRANT AMOUNT &amp; PAYMENT SCHEDULE</strong></p>
<p>Grantor shall pay Grantee a total of <strong>$500,000.00</strong>
(the <strong>"Grant Amount"</strong>).</p>
`;

describe("DOCX negotiation snapshot", () => {
	it("keeps authored structure and strips letterhead presentation", () => {
		const snapshot = negotiationSnapshotFromHtml(GRANT_HTML, [
			{ label: "Effective date", value: "2026-09-05" },
			{ label: "Grantor", value: "Acme Corporation" },
			{ label: "Grantee", value: "CAALM Solutions LLC" },
		]);

		expect(isDocxNegotiationSnapshot(snapshot)).toBe(true);
		expect(snapshot).toContain("# GRANT AGREEMENT");
		expect(snapshot).toContain("## 1. GRANT PURPOSE");
		expect(snapshot).toContain("## 2. GRANT AMOUNT & PAYMENT SCHEDULE");
		expect(snapshot).toContain('**"Grantor"**');
		expect(snapshot).toContain('**"Grant Amount"**');
		expect(snapshot).toContain(
			"- Expand outpatient behavioral health capacities",
		);
		expect(snapshot).not.toContain("CAALM Solutions Inc.");
		expect(snapshot).not.toContain("Miami, FL 33156");
		expect(snapshot).not.toContain("<img");
	});

	it("parses DOCX sections, metadata, and bullets into stable units", () => {
		const snapshot = negotiationSnapshotFromHtml(GRANT_HTML, [
			{ label: "Effective date", value: "2026-09-05" },
			{ label: "Grantor", value: "Acme Corporation" },
			{ label: "Grantee", value: "CAALM Solutions LLC" },
		]);
		const model = parseNegotiationDocument(snapshot);

		expect(model.source).toBe("docx");
		expect(model.title).toBe("GRANT AGREEMENT");
		expect(model.metadata).toContainEqual({
			label: "Effective date",
			value: "2026-09-05",
		});
		const toc = buildClauseToc(model.clauses);
		expect(toc.map((entry) => entry.title)).toEqual([
			"GRANT PURPOSE",
			"GRANT AMOUNT & PAYMENT SCHEDULE",
		]);
		expect(toc.map((entry) => entry.id)).toEqual([
			"clause-1-grant-purpose",
			"clause-2-grant-amount-payment-schedule",
		]);

		const bullets = model.negotiableParagraphs.filter(
			(paragraph) => paragraph.isBullet,
		);
		expect(bullets).toHaveLength(2);
		for (const paragraph of model.negotiableParagraphs) {
			expect(snapshot.slice(paragraph.start, paragraph.end)).toBe(
				paragraph.text,
			);
		}
	});

	it("flags only old thin markdown snapshots for safe rebuilding", () => {
		expect(
			isThinNegotiationSnapshot(
				"# Draft\n\n## 1. Payment\n\nPayment body.",
			),
		).toBe(true);
		expect(
			isThinNegotiationSnapshot(
				"# Draft\n\n## 1. Payment\n\nBody.\n\n## 2. Term\n\nBody.",
			),
		).toBe(false);
		expect(
			isThinNegotiationSnapshot(
				negotiationSnapshotFromHtml(GRANT_HTML, []),
			),
		).toBe(false);
	});

	it("replaces negotiated section text without removing letterhead or signatures", () => {
		const xml = `<w:document><w:body>
<w:p><w:r><w:t>CAALM LETTERHEAD</w:t></w:r></w:p>
<w:p><w:r><w:t>GRANT AGREEMENT</w:t></w:r></w:p>
<w:p><w:r><w:t>Old preamble.</w:t></w:r></w:p>
<w:p><w:r><w:t>1. GRANT PURPOSE</w:t></w:r></w:p>
<w:p><w:r><w:t>Old purpose.</w:t></w:r></w:p>
<w:p><w:r><w:t>2. ADDITIONAL TERMS</w:t></w:r></w:p>
<w:p><w:r><w:t>Old terms.</w:t></w:r></w:p>
<w:p><w:r><w:t>GRANTOR</w:t></w:r></w:p>
</w:body></w:document>`;
		const zip = new PizZip();
		zip.file("word/document.xml", xml);
		const updated = replaceNegotiationSectionsInDocx(
			zip.generate({ type: "nodebuffer" }),
			[
				{ index: 0, title: "", paragraphs: ["New preamble."] },
				{
					index: 1,
					title: "GRANT PURPOSE",
					paragraphs: ["New **Grant Purpose**."],
				},
				{
					index: 2,
					title: "ADDITIONAL TERMS",
					paragraphs: ["New terms."],
				},
			],
			"GRANT AGREEMENT",
		);
		const updatedXml = new PizZip(updated)
			.file("word/document.xml")!
			.asText();
		expect(updatedXml).toContain("CAALM LETTERHEAD");
		expect(updatedXml).toContain("New preamble.");
		expect(updatedXml).toContain("New terms.");
		expect(updatedXml).toContain("GRANTOR");
		expect(updatedXml).not.toContain("Old purpose.");
		expect(updatedXml).not.toContain("Old terms.");
		expect(updatedXml).not.toContain("**");
	});

	it("still replaces Additional Terms when bookmarks sit between paragraphs", () => {
		const xml = `<w:document><w:body>
<w:p><w:r><w:t>GRANT AGREEMENT</w:t></w:r></w:p>
<w:p><w:r><w:t>12. ADDITIONAL TERMS</w:t></w:r></w:p>
<w:bookmarkStart w:id="1" w:name="_RefTerms"/>
<w:p><w:r><w:t>Old additional terms body.</w:t></w:r></w:p>
<w:bookmarkEnd w:id="1"/>
<w:p><w:r><w:t>GRANTOR</w:t></w:r></w:p>
</w:body></w:document>`;
		const zip = new PizZip();
		zip.file("word/document.xml", xml);
		const updated = replaceNegotiationSectionsInDocx(
			zip.generate({ type: "nodebuffer" }),
			[
				{
					index: 12,
					title: "ADDITIONAL TERMS",
					paragraphs: ["This paragraph is for testing purposes."],
				},
			],
			"GRANT AGREEMENT",
		);
		const updatedXml = new PizZip(updated)
			.file("word/document.xml")!
			.asText();
		expect(updatedXml).toContain("This paragraph is for testing purposes.");
		expect(updatedXml).toContain('w:name="_RefTerms"');
		expect(updatedXml).toContain("GRANTOR");
		expect(updatedXml).not.toContain("Old additional terms body.");
	});
});
