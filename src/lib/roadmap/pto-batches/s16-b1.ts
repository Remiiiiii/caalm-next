/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 16 batch 1: Audit Lab review sessions
 */
export const PTO_BATCH_S16_B1 = {
	sectionNumber: 16,
	sectionTitle: "Audit Lab review sessions",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s16-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "16.1", title: "schedule_review_session" },
		{ taskCode: "16.2", title: "list_review_sessions" },
		{ taskCode: "16.3", title: "reschedule_review_session" },
		{ taskCode: "16.4", title: "cancel_review_session" },
		{ taskCode: "16.5", title: "invite_participants" },
	],
} as const;
