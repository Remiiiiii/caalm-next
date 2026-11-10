/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 2 batch 1: Contracts CLM depth
 */
export const PTO_BATCH_S02_B1 = {
	sectionNumber: 2,
	sectionTitle: "Contracts CLM depth",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s02-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "2.1", title: "get_contract" },
		{ taskCode: "2.2", title: "ask_contract" },
		{ taskCode: "2.3", title: "create_contract" },
		{ taskCode: "2.4", title: "update_contract_fields" },
		{ taskCode: "2.5", title: "bulk_update_contracts" },
	],
} as const;
