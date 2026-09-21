/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 2 batch 1: Gift and Campaign Ledger
 */
export const NPO_BATCH_S02_B1 = {
	sectionNumber: 2,
	sectionTitle: "Gift and Campaign Ledger",
	batch: 1,
	markerPath: "src/lib/roadmap/npo-batches/s02-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "2.1", title: "Gift permission keys" },
		{ taskCode: "2.2", title: "Gifts table and receipt allocator" },
		{ taskCode: "2.3", title: "Gift write APIs with posted immutability" },
		{ taskCode: "2.4", title: "Gift list and detail UI" },
		{ taskCode: "2.5", title: "Campaigns schema and UI" },
	],
} as const;
