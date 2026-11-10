/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 13 batch 1: News, briefing, notifications
 */
export const PTO_BATCH_S13_B1 = {
	sectionNumber: 13,
	sectionTitle: "News, briefing, notifications",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s13-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "13.1", title: "get_morning_briefing" },
		{ taskCode: "13.2", title: "list_notifications" },
		{ taskCode: "13.3", title: "send_sms_test" },
	],
} as const;
