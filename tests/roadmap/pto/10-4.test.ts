import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 10.4 cancel_task tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/taskTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "cancel_task"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers cancel_task and is mutating", () => {
		expect(source).toMatch(/name:\s*"cancel_task"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("soft-deletes via TaskService.deleteTask (no hard delete) and audits", () => {
		expect(toolBlock).toContain("TaskService.deleteTask(");
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
