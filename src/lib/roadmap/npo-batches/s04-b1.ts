/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 4 batch 1: Restricted-Fund Finance
 */
export const NPO_BATCH_S04_B1 = {
	sectionNumber: 4,
	sectionTitle: "Restricted-Fund Finance",
	batch: 1,
	markerPath: "src/lib/roadmap/npo-batches/s04-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "4.1", title: "Funds table (net-asset classes)" },
		{ taskCode: "4.2", title: "Require fundId on grant contracts" },
		{ taskCode: "4.3", title: "Flag existing grants missing a fund" },
		{ taskCode: "4.4", title: "Grant budget lines" },
		{ taskCode: "4.5", title: "Budget vs actual from obligations and gifts" },
	],
} as const;
