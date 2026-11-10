/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 6 batch 2: Audits CAPA depth
 */
export const PTO_BATCH_S06_B2 = {
	sectionNumber: 6,
	sectionTitle: "Audits CAPA depth",
	batch: 2,
	markerPath: "src/lib/roadmap/pto-batches/s06-b2.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "6.6", title: "upload_cap_evidence" },
		{ taskCode: "6.7", title: "list_open_caps" },
		{ taskCode: "6.8", title: "draft_verification_note" },
		{ taskCode: "6.9", title: "export_audit_report" },
		{ taskCode: "6.10", title: "run_readiness_check" },
	],
} as const;
