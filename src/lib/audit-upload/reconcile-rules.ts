import { jaccardSimilarity } from "./dedupe-findings";
import { AUDIT_SEVERITIES, type AuditFindingRecord, type AuditSeverity, type ReadinessItem, type ReconciliationResult } from "./types";

function bandIndex(severity: AuditSeverity | null): number | null {
	if (!severity) return null;
	const index = AUDIT_SEVERITIES.indexOf(severity);
	return index >= 0 ? index : null;
}

function matchReadinessItem(
	finding: Pick<AuditFindingRecord, "title" | "description" | "frameworkRefs">,
	items: ReadinessItem[],
): { item: ReadinessItem; score: number } | null {
	let best: { item: ReadinessItem; score: number } | null = null;
	const haystack = `${finding.title} ${finding.description}`;
	for (const item of items) {
		const score = Math.max(
			jaccardSimilarity(finding.title, item.label),
			jaccardSimilarity(haystack, `${item.label} ${item.notes || ""}`),
		);
		if (score >= 0.22 && (!best || score > best.score)) {
			best = { item, score };
		}
	}
	return best;
}

function isStale(item: ReadinessItem, periodStart?: string | null): boolean {
	const notes = (item.notes || "").toLowerCase();
	if (/exclud|stale|prior.?year|only the 20\d{2}|2025 exercise/.test(notes)) {
		return true;
	}
	if (item.evidenceDate && periodStart && item.evidenceDate < periodStart) {
		return true;
	}
	return false;
}

export function reconcileByRules(input: {
	title: string;
	description: string;
	frameworkRefs: string[];
	severityReported: AuditSeverity | null;
	severityComputed: AuditSeverity;
	readiness: ReadinessItem[];
	periodStart?: string | null;
}): ReconciliationResult {
	const match = matchReadinessItem(input, input.readiness);
	if (!match) {
		return {
			verdict: "untracked_gap",
			rationale:
				"No readiness item covers this topic. Create a readiness row so the next audit cycle can track it.",
			matchedRequirementIds: [],
			confidence: 0.7,
			suggestCreateReadiness: true,
		};
	}

	const { item } = match;
	if (item.status === "ready") {
		if (isStale(item, input.periodStart)) {
			return {
				verdict: "stale_readiness",
				rationale: `Readiness ${item.requirementId} is marked ready, but the evidence looks stale or covers the wrong population.`,
				matchedRequirementIds: [item.requirementId],
				confidence: 0.78,
			};
		}
		return {
			verdict: "false_finding",
			rationale: `Readiness ${item.requirementId} is ready and its evidence contradicts the auditor's condition.`,
			matchedRequirementIds: [item.requirementId],
			confidence: 0.8,
		};
	}

	const reportedBand = bandIndex(input.severityReported);
	const computedBand = bandIndex(input.severityComputed);
	const mismatch =
		reportedBand != null &&
		computedBand != null &&
		Math.abs(computedBand - reportedBand) >= 2;

	if (mismatch) {
		return {
			verdict: "severity_mismatch",
			rationale: `The gap is real (${item.requirementId} is ${item.status}), but the auditor's ${input.severityReported} rating is at least two bands below the computed ${input.severityComputed} risk.`,
			matchedRequirementIds: [item.requirementId],
			confidence: 0.82,
			alsoSupported: true,
		};
	}

	return {
		verdict: "supported",
		rationale: `Readiness ${item.requirementId} is ${item.status}, which agrees this is a real gap.`,
		matchedRequirementIds: [item.requirementId],
		confidence: 0.8,
	};
}
