import { describe, expect, it } from "vitest";
import type { NegotiationComment } from "@/lib/contracts/negotiation/comments.service";
import {
	buildClauseToc,
	parseNegotiationDocument,
	splitBlockIntoUnits,
	splitParagraphsWithOffsets,
} from "@/lib/contracts/negotiation/document-model";
import {
	buildParagraphMarkers,
	buildRedlineSegments,
} from "@/lib/contracts/negotiation/redline-render";

const WIZARD_TEXT = `# Test Grant Contract

- Other party: CAALM Solutions LLC
- Department: Executive
- Value: USD 500000
- Start: 2026-09-05
- Expiry: 2026-12-01
- Governing law: Florida
- Assembled: 2026-09-05

Grant funding for the fall program.

## 1. Payment & value

_Source: template · v1_

The Grantor shall provide funding in the amount of USD 450,000, disbursed in quarterly installments.

## 2. Confidentiality

_Source: template · v2_

Each party shall keep confidential all non-public information received from the other party.

---

### Clause lineage

- Payment & value (fam_pay v1, template)
- Confidentiality (fam_conf v2, template)
`;

function comment(partial: Partial<NegotiationComment>): NegotiationComment {
	return {
		$id: "c1",
		contractId: "contract1",
		orgId: "org1",
		versionId: "v1",
		anchorType: "paragraph",
		anchorStart: 0,
		anchorEnd: 0,
		body: "note",
		authorType: "internal",
		authorId: "u1",
		authorEmail: "",
		status: "open",
		redlineProposal: "",
		visibility: "shared",
		$createdAt: new Date().toISOString(),
		...partial,
	};
}

describe("negotiation document model", () => {
	it("keeps raw-text offsets when splitting paragraphs", () => {
		const text = "First block.\n\nSecond block here.";
		const rows = splitParagraphsWithOffsets(text);
		expect(rows).toHaveLength(2);
		expect(text.slice(rows[1].start, rows[1].end)).toBe("Second block here.");
	});

	it("separates metadata, preamble, clauses, and lineage", () => {
		const model = parseNegotiationDocument(WIZARD_TEXT);
		expect(model.title).toBe("Test Grant Contract");
		expect(model.metadata).toContainEqual({
			label: "Other party",
			value: "CAALM Solutions LLC",
		});
		expect(model.metadata).toContainEqual({
			label: "Governing law",
			value: "Florida",
		});

		// Preamble prose + 2 numbered clauses
		expect(model.clauses).toHaveLength(3);
		expect(model.clauses[0].index).toBe(0);
		expect(model.clauses[1].title).toBe("Payment & value");
		expect(model.clauses[1].sourceNote).toContain("template");
		expect(model.clauses[2].title).toBe("Confidentiality");

		// Metadata bullets and lineage are NOT negotiable paragraphs
		const negotiableText = model.negotiableParagraphs
			.map((row) => row.text)
			.join("\n");
		expect(negotiableText).not.toContain("Other party:");
		expect(negotiableText).not.toContain("Clause lineage");
		expect(negotiableText).toContain("USD 450,000");

		expect(model.lineage).toEqual([
			{
				title: "Payment & value",
				familyId: "fam_pay",
				version: 1,
				source: "template",
			},
			{
				title: "Confidentiality",
				familyId: "fam_conf",
				version: 2,
				source: "template",
			},
		]);

		// Paragraph offsets point into the raw text (anchor integrity)
		for (const row of model.negotiableParagraphs) {
			expect(WIZARD_TEXT.slice(row.start, row.end)).toBe(row.text);
		}
	});

	it("builds a clause TOC skipping the preamble", () => {
		const model = parseNegotiationDocument(WIZARD_TEXT);
		const toc = buildClauseToc(model.clauses);
		expect(toc.map((row) => row.title)).toEqual([
			"Payment & value",
			"Confidentiality",
		]);
	});

	it("falls back to plain paragraphs when there are no headings", () => {
		const model = parseNegotiationDocument(
			"Plain first paragraph.\n\nSecond paragraph.",
		);
		expect(model.clauses).toHaveLength(1);
		expect(model.negotiableParagraphs).toHaveLength(2);
	});

	it("splits nested bullets into individually anchorable units", () => {
		const text = `# Grant Agreement

- Other party: Acme
- Start: 2026-09-05

## 1. GRANT PURPOSE

The **Grantor** makes this grant for:
- charitable program delivery
- community outreach

## 2. REPORTING

_Source: template · v1_

- annual narrative report
- financial statement
`;
		const model = parseNegotiationDocument(text);
		expect(model.metadata).toEqual([
			{ label: "Other party", value: "Acme" },
			{ label: "Start", value: "2026-09-05" },
		]);
		expect(model.clauses.map((c) => c.title)).toEqual([
			"GRANT PURPOSE",
			"REPORTING",
		]);
		const toc = buildClauseToc(model.clauses);
		expect(toc.map((row) => row.title)).toEqual([
			"GRANT PURPOSE",
			"REPORTING",
		]);

		const purpose = model.clauses.find((c) => c.title === "GRANT PURPOSE")!;
		expect(purpose.paragraphs).toHaveLength(3);
		expect(purpose.paragraphs[0].text).toContain("**Grantor**");
		expect(purpose.paragraphs[0].isBullet).toBe(false);
		expect(purpose.paragraphs[1].text).toBe("- charitable program delivery");
		expect(purpose.paragraphs[1].isBullet).toBe(true);
		expect(purpose.paragraphs[2].text).toBe("- community outreach");

		const reporting = model.clauses.find((c) => c.title === "REPORTING")!;
		expect(reporting.paragraphs).toHaveLength(2);
		expect(reporting.paragraphs.every((p) => p.isBullet)).toBe(true);

		for (const row of model.negotiableParagraphs) {
			expect(text.slice(row.start, row.end)).toBe(row.text);
		}
		expect(model.negotiableParagraphs.map((p) => p.text).join("\n")).not.toContain(
			"Other party:",
		);
	});

	it("splitBlockIntoUnits keeps offsets into the parent block", () => {
		const block = {
			start: 10,
			end: 10 + "Lead-in:\n- a\n- b".length,
			text: "Lead-in:\n- a\n- b",
		};
		const units = splitBlockIntoUnits(block);
		expect(units).toHaveLength(3);
		expect(units[1].text).toBe("- a");
		expect(units[1].start).toBe(block.start + "Lead-in:\n".length);
	});

	it("recognizes plain numbered ALL-CAPS section headers", () => {
		const text = `GRANT AGREEMENT

1. GRANT PURPOSE

Purpose body here.

2. TERM

Term body here.
`;
		const model = parseNegotiationDocument(text);
		const toc = buildClauseToc(model.clauses);
		expect(toc.map((row) => `${row.index}. ${row.title}`)).toEqual([
			"1. GRANT PURPOSE",
			"2. TERM",
		]);
	});

	it("protects wizard labels and structural bold terms from redlines", () => {
		const text = `<!-- negotiation-snapshot:docx -->

# GRANT AGREEMENT

**Grantee:** Acme Health Services

The **Effective Date** controls when performance begins.
`;
		const model = parseNegotiationDocument(text);
		const [grantee, effectiveDate] = model.negotiableParagraphs;
		expect(grantee.protectedEnd).toBe(
			grantee.start + "**Grantee:** ".length,
		);
		expect(grantee.redlineAllowed).toBe(true);
		expect(effectiveDate.redlineAllowed).toBe(false);

		const malicious = comment({
			anchorStart: grantee.start,
			anchorEnd: grantee.end,
			redlineProposal: "Changed",
		});
		const segments = buildRedlineSegments(grantee, [malicious]);
		expect(segments[0]).toEqual({
			kind: "text",
			text: "**Grantee:** ",
		});
		expect(segments.some((segment) => segment.text.includes("**Grantee:**"))).toBe(
			true,
		);
	});
});

describe("inline redline segments", () => {
	it("renders removed span + added proposal inside the paragraph", () => {
		const model = parseNegotiationDocument(WIZARD_TEXT);
		const paymentParagraph = model.negotiableParagraphs.find((row) =>
			row.text.includes("USD 450,000"),
		)!;
		const spanStart =
			paymentParagraph.start + paymentParagraph.text.indexOf("USD 450,000");
		const redline = comment({
			anchorStart: spanStart,
			anchorEnd: spanStart + "USD 450,000".length,
			authorType: "counterparty",
			redlineProposal: "USD 500,000",
		});

		const segments = buildRedlineSegments(paymentParagraph, [redline]);
		expect(segments.map((s) => s.kind)).toEqual([
			"text",
			"removed",
			"added",
			"text",
		]);
		expect(segments[1].text).toBe("USD 450,000");
		expect(segments[2].text).toBe("USD 500,000");
		expect(segments[2].authorType).toBe("counterparty");
	});

	it("numbers markers in document order for open comments only", () => {
		const model = parseNegotiationDocument(WIZARD_TEXT);
		const [p1, p2] = [
			model.negotiableParagraphs[1],
			model.negotiableParagraphs[2],
		];
		const markers = buildParagraphMarkers(model.negotiableParagraphs, [
			comment({ $id: "a", anchorStart: p2.start, anchorEnd: p2.end }),
			comment({ $id: "b", anchorStart: p1.start, anchorEnd: p1.end }),
			comment({
				$id: "resolved",
				anchorStart: p1.start,
				anchorEnd: p1.end,
				status: "resolved",
			}),
		]);
		expect(markers).toHaveLength(2);
		expect(markers[0].paragraphStart).toBe(p1.start);
		expect(markers[0].number).toBe(1);
		expect(markers[0].commentIds).toEqual(["b"]);
		expect(markers[1].number).toBe(2);
	});
});
