/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 5 batch 1: Volunteer Programs
 */
export const NPO_BATCH_S05_B1 = {
	sectionNumber: 5,
	sectionTitle: "Volunteer Programs",
	batch: 1,
	markerPath: "src/lib/roadmap/npo-batches/s05-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "5.1", title: "Volunteer permission keys" },
		{ taskCode: "5.2", title: "Volunteer profile fields" },
		{ taskCode: "5.3", title: "Shift template schema" },
		{ taskCode: "5.4", title: "Shifts as calendar volunteer_shift events" },
		{ taskCode: "5.5", title: "Capacity and waitlist booking" },
	],
} as const;
