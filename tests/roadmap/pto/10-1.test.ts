import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 10.1 update_task tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/taskTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "update_task"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers update_task and is mutating, org-scoped", () => {
		expect(source).toMatch(/name:\s*"update_task"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("ctx.orgId");
	});

	it("wraps TaskService.updateTask and audits", () => {
		expect(toolBlock).toContain("TaskService.updateTask(");
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
