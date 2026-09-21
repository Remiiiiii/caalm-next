/**
 * Nonprofit Roadmap batch implementation ticket — implement all tasks on this PR branch.
 * Section 6 batch 1: Public Events and Check-in
 */
export const NPO_BATCH_S06_B1 = {
	sectionNumber: 6,
	sectionTitle: "Public Events and Check-in",
	batch: 1,
	markerPath: "src/lib/roadmap/npo-batches/s06-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "6.1", title: "Registration schema and ticket types" },
		{ taskCode: "6.2", title: "Event registrations tab" },
		{ taskCode: "6.3", title: "Guest email becomes a constituent at check-in" },
		{ taskCode: "6.4", title: "Signed QR tokens and scanner" },
		{ taskCode: "6.5", title: "Ticket-type capacity enforcement" },
	],
} as const;
