import type { AuditLabEvidenceLink } from "./types";

export type EvidenceLinkSummary = {
	hasDocumentary: boolean;
	hasTestimonial: boolean;
	/** Spoken claim(s) with no documentary file yet — auto-flag for the matrix list. */
	statementOnly: boolean;
	unconfirmedCount: number;
};

/** Group session evidence links by requirementId for the Evidence Matrix list columns. */
export function summarizeEvidenceLinks(
	links: AuditLabEvidenceLink[],
): Record<string, EvidenceLinkSummary> {
	const out: Record<string, EvidenceLinkSummary> = {};
	for (const link of links) {
		const row = (out[link.requirementId] ??= {
			hasDocumentary: false,
			hasTestimonial: false,
			statementOnly: false,
			unconfirmedCount: 0,
		});
		if (link.evidenceType === "documentary") row.hasDocumentary = true;
		if (link.evidenceType === "testimonial") row.hasTestimonial = true;
		if (link.aiSuggested && !link.confirmedByUserId) {
			row.unconfirmedCount += 1;
		}
	}
	for (const row of Object.values(out)) {
		row.statementOnly = row.hasTestimonial && !row.hasDocumentary;
	}
	return out;
}
