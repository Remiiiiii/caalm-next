/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 15 batch 1: Agent OS cross-cutting
 */
export const PTO_BATCH_S15_B1 = {
	sectionNumber: 15,
	sectionTitle: "Agent OS cross-cutting",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s15-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "15.1", title: "preview_mutation" },
		{ taskCode: "15.2", title: "undo_last_action" },
		{ taskCode: "15.3", title: "explain_why_denied" },
		{ taskCode: "15.4", title: "list_my_capabilities" },
		{ taskCode: "15.5", title: "compose_skill_multi_step" },
	],
} as const;
