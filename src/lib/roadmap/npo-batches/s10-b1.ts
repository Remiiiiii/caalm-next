/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 10 batch 1: Consent, Privacy, and Packaging
 */
export const NPO_BATCH_S10_B1 = {
	sectionNumber: 10,
	sectionTitle: "Consent, Privacy, and Packaging",
	batch: 1,
	markerPath: "src/lib/roadmap/npo-batches/s10-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "10.1", title: "Channel consent fields" },
		{ taskCode: "10.2", title: "Public preference-center token" },
		{ taskCode: "10.3", title: "Suppress receipts and appeals on consent" },
		{ taskCode: "10.4", title: "Constituents in tenant export" },
		{ taskCode: "10.5", title: "Constituents in tenant delete" },
	],
} as const;
