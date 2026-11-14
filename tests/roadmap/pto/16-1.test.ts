import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 16.1 schedule_review_session tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "schedule_review_session"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers schedule_review_session and is mutating", () => {
		expect(source).toMatch(/name:\s*"schedule_review_session"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("wraps scheduleReviewSession behind audit_lab.manage_sessions", () => {
		expect(toolBlock).toContain("scheduleReviewSession(");
		expect(toolBlock).toContain("PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS");
	});
});
