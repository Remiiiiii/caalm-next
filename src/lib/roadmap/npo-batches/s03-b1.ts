/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 3 batch 1: AI Fundraising Intelligence
 */
export const NPO_BATCH_S03_B1 = {
	sectionNumber: 3,
	sectionTitle: "AI Fundraising Intelligence",
	batch: 1,
	markerPath: "src/lib/roadmap/npo-batches/s03-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "3.1", title: "ai.fundraising permission" },
		{ taskCode: "3.2", title: "RFM feature extraction" },
		{ taskCode: "3.3", title: "Lifecycle segment storage and nightly job" },
		{ taskCode: "3.4", title: "Segment badges and list filter" },
		{ taskCode: "3.5", title: "Explainable lapse-risk score" },
	],
} as const;
