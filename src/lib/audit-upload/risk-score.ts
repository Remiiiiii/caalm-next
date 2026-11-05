import type { AuditSeverity } from "./types";

const SEVERITY_BANDS: { max: number; severity: AuditSeverity }[] = [
	{ max: 5, severity: "informational" },
	{ max: 8, severity: "low" },
	{ max: 12, severity: "medium" },
	{ max: 19, severity: "high" },
	{ max: 25, severity: "critical" },
];

function clampScore(value: number): number {
	if (!Number.isFinite(value)) return 1;
	return Math.min(5, Math.max(1, Math.round(value)));
}

export function scoreAuditRisk(
	likelihood: number,
	impact: number,
): { riskScore: number; computedSeverity: AuditSeverity } {
	const likelihoodClamped = clampScore(likelihood);
	const impactClamped = clampScore(impact);
	const riskScore = likelihoodClamped * impactClamped;
	const computedSeverity =
		SEVERITY_BANDS.find((band) => riskScore <= band.max)?.severity ?? "critical";
	return { riskScore, computedSeverity };
}
