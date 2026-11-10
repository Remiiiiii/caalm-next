/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 3 batch 1: Licenses
 */
export const PTO_BATCH_S03_B1 = {
	sectionNumber: 3,
	sectionTitle: "Licenses",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s03-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "3.1", title: "get_license" },
		{ taskCode: "3.2", title: "create_license" },
		{ taskCode: "3.3", title: "renew_license" },
		{ taskCode: "3.4", title: "approve_license" },
		{ taskCode: "3.5", title: "extract_license_from_document" },
	],
} as const;
