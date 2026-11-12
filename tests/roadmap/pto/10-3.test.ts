import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 10.3 create_task_for_finding tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/taskTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_task_for_finding"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_task_for_finding and is mutating", () => {
		expect(source).toMatch(/name:\s*"create_task_for_finding"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("links a license or an audit finding (typed link, like create_task_for_contract) and audits", () => {
		expect(toolBlock).toContain("getFinding(");
		expect(toolBlock).toContain("searchLicensesTable(");
		expect(toolBlock).toMatch(/linkedEntityType\s*=\s*"audit"/);
		expect(toolBlock).toMatch(/linkedEntityType\s*=\s*"license"/);
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
