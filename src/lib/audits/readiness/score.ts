import type { ComplianceRagStatus } from "@/lib/audits/types";

/** Minimum score for each RAG band. The UI reads these from the API, never hard-codes them. */
export const RAG_THRESHOLDS = { green: 85, amber: 70 } as const;

export function computeRag(score: number | null): ComplianceRagStatus | null {
	if (score === null || Number.isNaN(score)) return null;
	if (score >= RAG_THRESHOLDS.green) return "green";
	if (score >= RAG_THRESHOLDS.amber) return "amber";
	return "red";
}

/**
 * Customer-facing readiness score from live sources only.
 * No hardcoded baseline — empty orgs return null.
 */
export function computeLiveReadinessScore(parts: {
	contractComplianceRate: number | null;
	licenseRenewalHealth: number | null;
}): { score: number | null; sourcesUsed: string[] } {
	const sourcesUsed: string[] = [];
	const values: number[] = [];

	if (parts.contractComplianceRate !== null) {
		values.push(parts.contractComplianceRate);
		sourcesUsed.push("Contracts");
	}
	if (parts.licenseRenewalHealth !== null) {
		values.push(parts.licenseRenewalHealth);
		sourcesUsed.push("Licenses");
	}

	if (values.length === 0) {
		return { score: null, sourcesUsed: [] };
	}

	const score = Math.round(
		values.reduce((sum, value) => sum + value, 0) / values.length,
	);
	return { score, sourcesUsed };
}

/**
 * A domain is scored only when it contributed to the live average.
 * Empty domains stay out of the score (not counted as 0).
 * `sourcesUsed` is "Contracts" / "Licenses"; domain labels may be longer
 * ("Contracts & grants").
 */
export function isReadinessDomainScored(
	domain: { label: string },
	sourcesUsed: string[],
): boolean {
	const label = domain.label.trim().toLowerCase();
	if (!label) return false;
	return sourcesUsed.some((source) => {
		const name = source.trim().toLowerCase();
		if (!name) return false;
		return label === name || label.startsWith(`${name} `);
	});
}
