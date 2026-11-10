/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 12 batch 1: Integrations and mail
 */
export const PTO_BATCH_S12_B1 = {
	sectionNumber: 12,
	sectionTitle: "Integrations and mail",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s12-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "12.1", title: "send_gmail" },
		{ taskCode: "12.2", title: "send_outlook_mail" },
		{ taskCode: "12.3", title: "check_integration_status" },
		{ taskCode: "12.4", title: "sync_outlook_calendar" },
		{ taskCode: "12.5", title: "create_crm_draft_from_deal" },
	],
} as const;
