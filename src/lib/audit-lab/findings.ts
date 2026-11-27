/**
 * `review_gaps.description` carries a parseable `"[requirement:ID] "` prefix
 * for gaps traced back to an Evidence Readiness Matrix requirement, instead of
 * a new column — see the comment on `ReviewGap` in types.ts for why.
 */

const REQUIREMENT_PREFIX_RE = /^\[requirement:([^\]]+)\]\s*/;

/** The requirementId a gap's description was tagged with, or undefined for gaps raised outside the matrix flow (e.g. the legacy `scoreAnswer` path). */
export function gapRequirementId(description: string): string | undefined {
	return description.match(REQUIREMENT_PREFIX_RE)?.[1];
}

export type FindingAttributes = {
	requirementId: string;
	/** "What should be true" — the requirement itself. */
	criteria: string;
	/** "What is" — the corroborated gap, contradiction, or evidence still missing. */
	condition: string;
	/** "Why" — often only available from interview testimony. */
	cause?: string;
	/** "So what" — left for a human reviewer to add; interviews don't establish risk severity. */
	effect?: string;
};

/** Composes the IIA five-attribute finding (minus `recommendation`, left to the reviewer) into one `review_gaps.description` string. */
export function formatGapDescription(finding: FindingAttributes): string {
	const parts = [
		`Criteria: ${finding.criteria}`,
		`Condition: ${finding.condition}`,
	];
	if (finding.cause) parts.push(`Cause: ${finding.cause}`);
	if (finding.effect) parts.push(`Effect: ${finding.effect}`);
	return `[requirement:${finding.requirementId}] ${parts.join(" | ")}`;
}
