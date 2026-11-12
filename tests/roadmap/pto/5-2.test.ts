import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 5.2 create_clause tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/clauseTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_clause"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_clause gated by clauses.create and is mutating", () => {
		expect(source).toMatch(/name:\s*"create_clause"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CLAUSES\.CREATE/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("handles create, update, and retire with the matching permission, and audits", () => {
		expect(toolBlock).toContain("createClause(");
		expect(toolBlock).toContain("updateClause(");
		expect(toolBlock).toContain("archiveClause(");
		expect(toolBlock).toMatch(/PERMISSIONS\.CLAUSES\.EDIT/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CLAUSES\.DELETE/);
		expect(toolBlock).toContain("auditLibrary(");
	});
});
