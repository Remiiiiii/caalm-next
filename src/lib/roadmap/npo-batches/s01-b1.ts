/**
 * Section 1 batch 1. PR #109 (this marker on the placeholder branch) completes zero tasks.
 * Implement 1.1–1.5 on PR #131 — same batch, not one PR per task code.
 */
export const NPO_BATCH_S01_B1 = {
	sectionNumber: 1,
	sectionTitle: "Constituent CRM Foundation",
	batch: 1,
	linkedPrNumber: 109,
	implementationPrNumber: 131,
	markerPath: "src/lib/roadmap/npo-batches/s01-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "1.1", title: "Constituent permission keys and nav" },
		{ taskCode: "1.2", title: "Constituents table schema" },
		{ taskCode: "1.3", title: "Org-scoped constituent APIs" },
		{ taskCode: "1.4", title: "Duplicate detection on email and name" },
		{ taskCode: "1.5", title: "Constituent list page" },
	],
} as const;
