/**
 * Nonprofit Roadmap catalog stub — no product implementation.
 * Section 2 batch 1: Gift and Campaign Ledger
 */
export const NPO_STUB_S02_B1 = {
	sectionNumber: 2,
	sectionTitle: "Gift and Campaign Ledger",
	batch: 1,
	stub: true,
	tasks: [
		{ taskCode: "2.1", title: "Gift permission keys" },
		{ taskCode: "2.2", title: "Gifts table and receipt allocator" },
		{ taskCode: "2.3", title: "Gift write APIs with posted immutability" },
		{ taskCode: "2.4", title: "Gift list and detail UI" },
		{ taskCode: "2.5", title: "Campaigns schema and UI" },
	],
} as const;
