import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 5.3 insert_clause_into_draft tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/clauseTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "insert_clause_into_draft"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers insert_clause_into_draft gated by contracts.edit and is mutating", () => {
		expect(source).toMatch(/name:\s*"insert_clause_into_draft"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONTRACTS\.EDIT/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("appends an injected section to the wizard draft and audits the edit", () => {
		expect(toolBlock).toContain('source: "injected"');
		expect(toolBlock).toContain("saveWizardSession(");
		expect(toolBlock).toContain("auditLibrary(");
	});
});
