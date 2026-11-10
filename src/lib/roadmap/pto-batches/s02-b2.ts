/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 2 batch 2: Contracts CLM depth
 */
export const PTO_BATCH_S02_B2 = {
	sectionNumber: 2,
	sectionTitle: "Contracts CLM depth",
	batch: 2,
	markerPath: "src/lib/roadmap/pto-batches/s02-b2.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "2.6", title: "extract_contract_terms" },
		{ taskCode: "2.7", title: "summarize_contract" },
		{ taskCode: "2.8", title: "compare_contract_versions" },
		{ taskCode: "2.9", title: "check_playbook_deviations" },
		{ taskCode: "2.10", title: "suggest_redlines" },
	],
} as const;
