/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 14 batch 1: Analytics and exports
 */
export const PTO_BATCH_S14_B1 = {
	sectionNumber: 14,
	sectionTitle: "Analytics and exports",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s14-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "14.1", title: "query_risk_averted" },
		{ taskCode: "14.2", title: "export_table_csv" },
		{ taskCode: "14.3", title: "schedule_report" },
	],
} as const;
