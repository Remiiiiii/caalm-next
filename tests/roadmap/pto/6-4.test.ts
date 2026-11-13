import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.4 create_corrective_action tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_corrective_action"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_corrective_action gated by audit.manage_caps and is mutating", () => {
		expect(source).toMatch(/name:\s*"create_corrective_action"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.MANAGE_CAPS/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("wraps createCap org-scoped, refuses a duplicate CAP, and audits", () => {
		expect(toolBlock).toContain("createCap(");
		expect(toolBlock).toContain("already has a corrective action");
		expect(toolBlock).toContain("logAuditUploadEvent(");
	});
});
