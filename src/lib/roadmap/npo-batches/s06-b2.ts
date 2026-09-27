/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 6 batch 2: Public Events and Check-in
 */
export const NPO_BATCH_S06_B2 = {
	sectionNumber: 6,
	sectionTitle: "Public Events and Check-in",
	batch: 2,
	markerPath: "src/lib/roadmap/npo-batches/s06-b2.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "6.6", title: "Donation-at-registration transaction" },
		{ taskCode: "6.7", title: "Event campaign join" },
		{ taskCode: "6.8", title: "Registration confirmation email" },
		{ taskCode: "6.9", title: "No public PII on check-in success" },
		{ taskCode: "6.10", title: "Event roster export" },
	],
} as const;
