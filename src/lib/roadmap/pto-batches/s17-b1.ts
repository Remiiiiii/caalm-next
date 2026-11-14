/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section 17 batch 1: Audit Lab roles and interview prep
 */
export const PTO_BATCH_S17_B1 = {
	sectionNumber: 17,
	sectionTitle: "Audit Lab roles and interview prep",
	batch: 1,
	markerPath: "src/lib/roadmap/pto-batches/s17-b1.ts",
	batchTicket: true,
	tasks: [
		{ taskCode: "17.1", title: "assign_session_role" },
		{ taskCode: "17.2", title: "generate_question_bank" },
		{ taskCode: "17.3", title: "add_question" },
		{ taskCode: "17.4", title: "import_questions_from_findings" },
		{ taskCode: "17.5", title: "generate_interview_script" },
	],
} as const;
