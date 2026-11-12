import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 5.1 search_clauses tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/clauseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "search_clauses"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers search_clauses gated by clauses.view and wires CLAUSE_TOOLS into the registry", () => {
		expect(source).toMatch(/name:\s*"search_clauses"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CLAUSES\.VIEW/);
		expect(registry).toContain("...CLAUSE_TOOLS");
	});

	it("is read-only and wraps listClauses/getClauseById, org-scoped", () => {
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("listClauses(");
		expect(toolBlock).toContain("getClauseById(");
	});
});
