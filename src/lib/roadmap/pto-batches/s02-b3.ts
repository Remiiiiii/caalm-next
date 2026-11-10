/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 2 batch 3: Contracts CLM depth
 */
export const PTO_BATCH_S02_B3 = {
	sectionNumber: 2,
	sectionTitle: "Contracts CLM depth",
	batch: 3,
	markerPath: "src/lib/roadmap/pto-batches/s02-b3.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "2.11", title: "list_contract_obligations" },
		{ taskCode: "2.12", title: "send_counterparty_invite" },
		{ taskCode: "2.13", title: "send_for_signature" },
		{ taskCode: "2.14", title: "approve_contract" },
		{ taskCode: "2.15", title: "renew_contract" },
	],
} as const;
