/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 4 batch 1: Approvals write
 */
export const PTO_BATCH_S04_B1 = {
	sectionNumber: 4,
	sectionTitle: "Approvals write",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s04-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "4.1", title: "get_approval" },
		{ taskCode: "4.2", title: "approve_request" },
		{ taskCode: "4.3", title: "reassign_approval" },
		{ taskCode: "4.4", title: "override_approval" },
	],
} as const;
