/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 1 batch 1: Users and org admin
 */
export const PTO_BATCH_S01_B1 = {
	sectionNumber: 1,
	sectionTitle: "Users and org admin",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s01-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "1.1", title: "invite_user" },
		{ taskCode: "1.2", title: "resend_invite" },
		{ taskCode: "1.3", title: "list_users" },
		{ taskCode: "1.4", title: "assign_user_roles" },
		{ taskCode: "1.5", title: "deactivate_user" },
	],
} as const;
