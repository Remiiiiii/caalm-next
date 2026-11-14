import { describe, expect, it } from "vitest";
import { findCatalogTask } from "@/lib/roadmap/catalog-query";
import { PRODUCTION_TOOLS_ROADMAP_CATALOG } from "@/lib/roadmap/production-tools-catalog";
import { PTO_PR_BATCHES } from "@/lib/roadmap/production-tools/pto-pr-batches";

const AUDIT_LAB_TOOLS = [
	["16.1", "schedule_review_session"],
	["16.2", "list_review_sessions"],
	["16.3", "reschedule_review_session"],
	["16.4", "cancel_review_session"],
	["16.5", "invite_participants"],
	["17.1", "assign_session_role"],
	["17.2", "generate_question_bank"],
	["17.3", "add_question"],
	["17.4", "import_questions_from_findings"],
	["17.5", "generate_interview_script"],
	["18.1", "generate_evidence_request_list"],
	["18.2", "assign_evidence_owner"],
	["18.3", "update_evidence_status"],
	["18.4", "evidence_coverage_report"],
	["18.5", "who_owns_evidence"],
	["19.1", "start_practice_round"],
	["19.2", "score_answer"],
	["19.3", "request_feedback"],
	["19.4", "find_rehearsal_gaps"],
	["19.5", "session_readiness_report"],
	["19.6", "department_readiness_summary"],
] as const;

describe("PTO Audit Lab catalog (sections 16–19)", () => {
	it("lists all 21 spec §11 tool codes with matching titles", () => {
		for (const [code, title] of AUDIT_LAB_TOOLS) {
			const found = PRODUCTION_TOOLS_ROADMAP_CATALOG.some((section) => {
				const task = findCatalogTask(section.tasks, code);
				return task?.title === title;
			});
			expect(found, `missing ${code} ${title}`).toBe(true);
		}
		expect(AUDIT_LAB_TOOLS).toHaveLength(21);
	});

	it("splits 16–19 into five batches of at most five tasks", () => {
		const batches = PTO_PR_BATCHES.filter((b) => b.sectionNumber >= 16);
		expect(batches).toHaveLength(5);
		for (const batch of batches) {
			expect(batch.taskCodes.length).toBeLessThanOrEqual(5);
		}
	});
});
