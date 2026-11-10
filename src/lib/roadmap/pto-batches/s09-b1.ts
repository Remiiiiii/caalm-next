/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 9 batch 1: Calendar and events gaps
 */
export const PTO_BATCH_S09_B1 = {
	sectionNumber: 9,
	sectionTitle: "Calendar and events gaps",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s09-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "9.1", title: "invite_event_attendees" },
		{ taskCode: "9.2", title: "approve_calendar_request" },
		{ taskCode: "9.3", title: "share_calendar" },
		{ taskCode: "9.4", title: "create_public_event" },
	],
} as const;
