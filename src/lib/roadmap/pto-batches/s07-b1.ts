/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 7 batch 1: Funding and proposals
 */
export const PTO_BATCH_S07_B1 = {
	sectionNumber: 7,
	sectionTitle: "Funding and proposals",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s07-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "7.1", title: "search_funding" },
		{ taskCode: "7.2", title: "list_funding_obligations" },
		{ taskCode: "7.3", title: "create_proposal" },
		{ taskCode: "7.4", title: "link_contract_to_funding" },
	],
} as const;
