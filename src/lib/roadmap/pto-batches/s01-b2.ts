/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 1 batch 2: Users and org admin
 */
export const PTO_BATCH_S01_B2 = {
	sectionNumber: 1,
	sectionTitle: "Users and org admin",
	batch: 2,
	markerPath: "src/lib/roadmap/pto-batches/s01-b2.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "1.6", title: "update_user_profile" },
		{ taskCode: "1.7", title: "list_roles" },
		{ taskCode: "1.8", title: "update_org_settings" },
	],
} as const;
