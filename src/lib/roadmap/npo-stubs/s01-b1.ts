/**
 * Nonprofit Roadmap catalog stub — no product implementation.
 * Section 1 batch 1: Constituent CRM Foundation
 */
export const NPO_STUB_S01_B1 = {
	sectionNumber: 1,
	sectionTitle: "Constituent CRM Foundation",
	batch: 1,
	stub: true,
	tasks: [
		{ taskCode: "1.1", title: "Constituent permission keys and nav" },
		{ taskCode: "1.2", title: "Constituents table schema" },
		{ taskCode: "1.3", title: "Org-scoped constituent APIs" },
		{ taskCode: "1.4", title: "Duplicate detection on email and name" },
		{ taskCode: "1.5", title: "Constituent list page" },
	],
} as const;
