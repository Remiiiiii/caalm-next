/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 10 batch 2: Consent, Privacy, and Packaging
 */
export const NPO_BATCH_S10_B2 = {
	sectionNumber: 10,
	sectionTitle: "Consent, Privacy, and Packaging",
	batch: 2,
	markerPath: "src/lib/roadmap/npo-batches/s10-b2.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "10.6", title: "Packaging grep for banned NPO claims" },
		{ taskCode: "10.7", title: "Pricing and docs match shipped routes" },
		{ taskCode: "10.8", title: "Roadmap 100% gate" },
		{ taskCode: "10.9", title: "Consent retention note for AI scores" },
		{ taskCode: "10.10", title: "Final dual-catalog isolation check" },
	],
} as const;
