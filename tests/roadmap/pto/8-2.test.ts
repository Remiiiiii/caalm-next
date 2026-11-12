import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 8.2 add_relationship tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/constituentTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "add_relationship"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers add_relationship gated by constituents.manage and is mutating", () => {
		expect(source).toMatch(/name:\s*"add_relationship"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONSTITUENTS\.MANAGE/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("wraps the relationship service and audits", () => {
		expect(toolBlock).toContain("createRelationship(");
		expect(toolBlock).toContain("auditNonprofit(");
	});
});
