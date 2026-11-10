/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 6 batch 1: Audits CAPA depth
 */
export const PTO_BATCH_S06_B1 = {
	sectionNumber: 6,
	sectionTitle: "Audits CAPA depth",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s06-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "6.1", title: "list_audit_documents" },
		{ taskCode: "6.2", title: "list_findings" },
		{ taskCode: "6.3", title: "dispute_finding" },
		{ taskCode: "6.4", title: "create_corrective_action" },
		{ taskCode: "6.5", title: "assign_cap_owner" },
	],
} as const;
