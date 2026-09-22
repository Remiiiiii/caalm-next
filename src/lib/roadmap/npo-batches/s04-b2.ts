/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 4 batch 2: Restricted-Fund Finance
 */
export const NPO_BATCH_S04_B2 = {
	sectionNumber: 4,
	sectionTitle: "Restricted-Fund Finance",
	batch: 2,
	markerPath: "src/lib/roadmap/npo-batches/s04-b2.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "4.6", title: "990 functional-expense mapping table" },
		{ taskCode: "4.7", title: "990 worksheet CSV export" },
		{ taskCode: "4.8", title: "Restriction release event" },
		{ taskCode: "4.9", title: "Release appears on journal export later" },
		{ taskCode: "4.10", title: "Finance help copy and out-of-lane guards" },
	],
} as const;
