/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 18 batch 1: Audit Lab evidence matrix
 */
export const PTO_BATCH_S18_B1 = {
	sectionNumber: 18,
	sectionTitle: "Audit Lab evidence matrix",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s18-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "18.1", title: "generate_evidence_request_list" },
		{ taskCode: "18.2", title: "assign_evidence_owner" },
		{ taskCode: "18.3", title: "update_evidence_status" },
		{ taskCode: "18.4", title: "evidence_coverage_report" },
		{ taskCode: "18.5", title: "who_owns_evidence" },
	],
} as const;
