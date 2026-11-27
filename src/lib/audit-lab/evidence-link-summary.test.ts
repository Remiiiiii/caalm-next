import { describe, expect, it } from "vitest";
import { summarizeEvidenceLinks } from "./evidence-link-summary";
import type { AuditLabEvidenceLink } from "./types";

function link(
	partial: Partial<AuditLabEvidenceLink> &
		Pick<AuditLabEvidenceLink, "requirementId" | "evidenceType">,
): AuditLabEvidenceLink {
	return {
		$id: partial.$id ?? "link-1",
		orgId: "org-1",
		sessionId: "session-1",
		relation: "supports",
		...partial,
	};
}

describe("summarizeEvidenceLinks", () => {
	it("flags statement-only when testimonials exist without documentary", () => {
		const summary = summarizeEvidenceLinks([
			link({
				requirementId: "CW-PROVIDER-CONTRACT",
				evidenceType: "testimonial",
				aiSuggested: true,
			}),
		]);
		expect(summary["CW-PROVIDER-CONTRACT"]).toEqual({
			hasDocumentary: false,
			hasTestimonial: true,
			statementOnly: true,
			unconfirmedCount: 1,
		});
	});

	it("clears statement-only once a documentary link exists", () => {
		const summary = summarizeEvidenceLinks([
			link({
				$id: "a",
				requirementId: "CC6",
				evidenceType: "testimonial",
			}),
			link({
				$id: "b",
				requirementId: "CC6",
				evidenceType: "documentary",
			}),
		]);
		expect(summary.CC6.statementOnly).toBe(false);
		expect(summary.CC6.hasDocumentary).toBe(true);
		expect(summary.CC6.hasTestimonial).toBe(true);
	});

	it("counts only unconfirmed AI-suggested links", () => {
		const summary = summarizeEvidenceLinks([
			link({
				$id: "a",
				requirementId: "R1",
				evidenceType: "testimonial",
				aiSuggested: true,
			}),
			link({
				$id: "b",
				requirementId: "R1",
				evidenceType: "testimonial",
				aiSuggested: true,
				confirmedByUserId: "user-1",
			}),
			link({
				$id: "c",
				requirementId: "R1",
				evidenceType: "documentary",
			}),
		]);
		expect(summary.R1.unconfirmedCount).toBe(1);
	});

	it("returns an empty object for no links", () => {
		expect(summarizeEvidenceLinks([])).toEqual({});
	});
});
