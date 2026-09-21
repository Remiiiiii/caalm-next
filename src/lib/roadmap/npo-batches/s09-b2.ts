/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 9 batch 2: Imports, Payments, and Finance Export
 */
export const NPO_BATCH_S09_B2 = {
	sectionNumber: 9,
	sectionTitle: "Imports, Payments, and Finance Export",
	batch: 2,
	markerPath: "src/lib/roadmap/npo-batches/s09-b2.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "9.6", title: "Give page UI" },
		{ taskCode: "9.7", title: "Journal export CSV/IIF" },
		{ taskCode: "9.8", title: "Release rows on the journal export" },
		{ taskCode: "9.9", title: "Import/export audit log" },
		{ taskCode: "9.10", title: "Finance export help copy" },
	],
} as const;
