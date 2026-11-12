import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.5 assign_cap_owner tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "assign_cap_owner"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers assign_cap_owner gated by audit.manage_caps and is mutating", () => {
		expect(source).toMatch(/name:\s*"assign_cap_owner"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.MANAGE_CAPS/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("wraps updateCap with assigneeId/dueAt, org-scoped, and audits", () => {
		expect(toolBlock).toContain("updateCap(");
		expect(toolBlock).toContain("assigneeId");
		expect(toolBlock).toContain("dueAt");
		expect(toolBlock).toContain("logAuditUploadEvent(");
	});
});
