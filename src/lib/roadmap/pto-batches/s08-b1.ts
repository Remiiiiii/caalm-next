/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 8 batch 1: Constituents, gifts, donations, volunteers
 */
export const PTO_BATCH_S08_B1 = {
	sectionNumber: 8,
	sectionTitle: "Constituents, gifts, donations, volunteers",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s08-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "8.1", title: "search_constituents" },
		{ taskCode: "8.2", title: "add_relationship" },
		{ taskCode: "8.3", title: "log_gift" },
		{ taskCode: "8.4", title: "share_donation_page" },
		{ taskCode: "8.5", title: "assign_volunteer" },
	],
} as const;
