import { listCaps, listFindings } from "./store";

export async function generateFeedbackReport(
	orgId: string,
	documentId: string,
): Promise<Record<string, unknown>> {
	const [findings, caps] = await Promise.all([
		listFindings({ orgId, documentId, limit: 200 }),
		listCaps({ orgId, documentId, limit: 200 }),
	]);
	const quarantined = findings.filter((finding) => !finding.citationCheckPassed);
	const repeats = findings.filter((finding) => finding.isRepeat);
	const bySeverity = findings.reduce<Record<string, number>>((acc, finding) => {
		acc[finding.severityComputed] = (acc[finding.severityComputed] ?? 0) + 1;
		return acc;
	}, {});
	const disputed = findings.filter((finding) => finding.status === "disputed");
	const falseFindings = findings.filter(
		(finding) => finding.reconciliation?.verdict === "false_finding",
	);
	const stale = findings.filter(
		(finding) => finding.reconciliation?.verdict === "stale_readiness",
	);
	const untracked = findings.filter(
		(finding) => finding.reconciliation?.verdict === "untracked_gap",
	);
	const predicted = findings.filter((finding) =>
		["supported", "severity_mismatch"].includes(
			finding.reconciliation?.verdict || "",
		),
	);
	return {
		generatedAt: new Date().toISOString(),
		findingCount: findings.length,
		quarantinedCount: quarantined.length,
		repeatCount: repeats.length,
		disputedCount: disputed.length,
		auditorErrorCount: falseFindings.length,
		readinessBlindSpots: stale.length + untracked.length,
		readinessPredictedCount: predicted.length,
		severityCounts: bySeverity,
		capCount: caps.length,
		openCapCount: caps.filter((cap) =>
			["open", "in_progress", "overdue", "escalated"].includes(cap.status),
		).length,
		recurringThemes: repeats.map((finding) => finding.title),
		notes: [
			quarantined.length
				? `${quarantined.length} finding(s) were held back because the quote could not be verified.`
				: "Every extracted finding had a matching quote.",
			repeats.length
				? `${repeats.length} finding(s) look like repeats of earlier work.`
				: "No repeat findings were flagged.",
			falseFindings.length
				? `${falseFindings.length} finding(s) look like auditor errors against current readiness.`
				: "No auditor-error findings were flagged.",
			`${stale.length + untracked.length} readiness blind spot(s) (stale or untracked).`,
		],
	};
}
