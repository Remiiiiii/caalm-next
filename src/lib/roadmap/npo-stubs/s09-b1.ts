/**
 * Nonprofit Roadmap catalog stub — no product implementation.
 * Section 9 batch 1: Imports, Payments, and Finance Export
 */
export const NPO_STUB_S09_B1 = {
	sectionNumber: 9,
	sectionTitle: "Imports, Payments, and Finance Export",
	batch: 1,
	stub: true,
	tasks: [
		{ taskCode: "9.1", title: "CSV mapper UI" },
		{ taskCode: "9.2", title: "Dry-run import" },
		{ taskCode: "9.3", title: "Commit import batch" },
		{ taskCode: "9.4", title: "Public give page allowlist" },
		{ taskCode: "9.5", title: "Stripe donation Checkout" },
	],
} as const;
