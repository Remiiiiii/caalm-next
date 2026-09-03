import type {
	ClauseDeviation,
	DeviationReport,
	ExtractedClauseInput,
} from "@/types/playbook-deviations";

/** Fixture clauses used to drive 5.4 review UI without a live document extract. */
export const SEEDED_EXTRACTED_CLAUSES: ExtractedClauseInput[] = [
	{
		id: "seed_pass",
		title: "Confidentiality",
		category: "confidentiality",
		body: "Each party shall keep confidential information secret.",
	},
	{
		id: "seed_deviate",
		title: "Liability",
		category: "liability",
		body: "Neither party has any liability for damages of any kind.",
	},
	{
		id: "seed_missing",
		title: "Termination",
		category: "termination",
		body: "Either party may terminate for convenience on 10 days notice.",
	},
];

function deviation(overrides: Partial<ClauseDeviation>): ClauseDeviation {
	return {
		extractedId: undefined,
		extractedTitle: undefined,
		extractedCategory: undefined,
		standardId: null,
		standardFamilyId: null,
		standardVersion: null,
		standardTitle: null,
		verdict: "pass",
		severity: "low",
		rationale: "",
		differingPoints: [],
		...overrides,
	};
}

/**
 * Deterministic report for review UI + roadmap AC:
 * matching standard passes; off-standard is flagged with severity.
 */
export function buildSeededDeviationReport(): DeviationReport {
	const deviations: ClauseDeviation[] = [
		deviation({
			extractedId: "seed_pass",
			extractedTitle: "Confidentiality",
			extractedCategory: "confidentiality",
			standardId: "std_conf",
			standardFamilyId: "fam_conf",
			standardVersion: 1,
			standardTitle: "Confidentiality",
			verdict: "pass",
			severity: "low",
			rationale: "Matches the published playbook wording.",
		}),
		deviation({
			extractedId: "seed_deviate",
			extractedTitle: "Liability",
			extractedCategory: "liability",
			standardId: "std_liability",
			standardFamilyId: "fam_liability",
			standardVersion: 2,
			standardTitle: "Limitation of liability",
			verdict: "deviate",
			severity: "high",
			rationale:
				"The extracted clause waives all liability instead of the playbook cap.",
			differingPoints: [
				"Removes liability entirely",
				"Missing playbook damage cap",
			],
		}),
		deviation({
			extractedId: "seed_missing",
			extractedTitle: "Termination",
			extractedCategory: "termination",
			verdict: "no_standard",
			severity: "medium",
			rationale:
				"No published playbook standard matches this clause category.",
		}),
	];

	return {
		deviations,
		summary: {
			passCount: 1,
			deviateCount: 1,
			noStandardCount: 1,
		},
	};
}
