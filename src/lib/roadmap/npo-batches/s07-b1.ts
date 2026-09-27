/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 7 batch 1: Stewardship Automation
 */
export const NPO_BATCH_S07_B1 = {
	sectionNumber: 7,
	sectionTitle: "Stewardship Automation",
	batch: 1,
	markerPath: "src/lib/roadmap/npo-batches/s07-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "7.1", title: "Gift receipt template" },
		{ taskCode: "7.2", title: "Idempotent posted-gift receipt send" },
		{ taskCode: "7.3", title: "At-risk donor queue page" },
		{ taskCode: "7.4", title: "Contacted writeback" },
		{ taskCode: "7.5", title: "Next-best-action rules" },
	],
} as const;
