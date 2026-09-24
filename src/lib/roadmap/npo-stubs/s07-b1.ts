/**
 * Nonprofit Roadmap catalog stub — no product implementation.
 * Section 7 batch 1: Stewardship Automation
 */
export const NPO_STUB_S07_B1 = {
	sectionNumber: 7,
	sectionTitle: "Stewardship Automation",
	batch: 1,
	stub: true,
	tasks: [
		{ taskCode: "7.1", title: "Gift receipt template" },
		{ taskCode: "7.2", title: "Idempotent posted-gift receipt send" },
		{ taskCode: "7.3", title: "At-risk donor queue page" },
		{ taskCode: "7.4", title: "Contacted writeback" },
		{ taskCode: "7.5", title: "Next-best-action rules" },
	],
} as const;
