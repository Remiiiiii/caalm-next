import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const TOOLS = [
	["schedule_review_session", true],
	["list_review_sessions", false],
	["reschedule_review_session", true],
	["cancel_review_session", true],
	["invite_participants", true],
	["assign_session_role", true],
	["generate_question_bank", true],
	["add_question", true],
	["import_questions_from_findings", true],
	["generate_interview_script", true],
	["generate_evidence_request_list", true],
	["assign_evidence_owner", true],
	["update_evidence_status", true],
	["evidence_coverage_report", false],
	["who_owns_evidence", false],
	["start_practice_round", true],
	["score_answer", true],
	["request_feedback", true],
	["find_rehearsal_gaps", false],
	["session_readiness_report", false],
	["department_readiness_summary", false],
] as const;

describe("PTO Audit Lab assistant tools", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);

	it("registers all 21 spec §11 tools", () => {
		for (const [name, mutating] of TOOLS) {
			expect(source).toMatch(new RegExp(`name:\\s*"${name}"`));
			const start = source.indexOf(`name: "${name}"`);
			const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
			const block = source.slice(start, next === -1 ? undefined : next);
			expect(block).toMatch(new RegExp(`mutating:\\s*${mutating}`));
		}
		expect(TOOLS).toHaveLength(21);
	});

	it("gates writes on audit_lab.* permissions and wraps Lab services", () => {
		expect(source).toContain("PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS");
		expect(source).toContain("PERMISSIONS.AUDIT_LAB.MANAGE_EVIDENCE");
		expect(source).toContain("PERMISSIONS.AUDIT_LAB.RUN_PRACTICE");
		expect(source).toContain("PERMISSIONS.AUDIT_LAB.VIEW");
		expect(source).toContain("scheduleReviewSession");
		const service = readFileSync(
			join(process.cwd(), "src/lib/audit-lab/service.ts"),
			"utf8",
		);
		expect(service).toContain("logAuditEvent(");
	});
});
