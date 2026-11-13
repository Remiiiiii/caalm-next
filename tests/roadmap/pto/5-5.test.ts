import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 5.5 seed_clause_from_document tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/clauseTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "seed_clause_from_document"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers seed_clause_from_document gated by clauses.create and is read-only (never auto-saves)", () => {
		expect(source).toMatch(/name:\s*"seed_clause_from_document"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CLAUSES\.CREATE/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("wraps extractClausesWithGemini and returns candidates for review, never saving", () => {
		expect(toolBlock).toContain("extractClausesWithGemini(");
		expect(toolBlock).toContain("nothing was saved");
		expect(toolBlock).not.toContain("createClause(");
	});
});
