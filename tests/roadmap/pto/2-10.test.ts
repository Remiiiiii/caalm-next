import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.10 suggest_redlines tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers suggest_redlines gated by contracts.review and never auto-saves", () => {
		expect(source).toMatch(/name:\s*"suggest_redlines"/);
		expect(source).toMatch(
			/name:\s*"suggest_redlines"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.REVIEW/,
		);
		expect(source).toMatch(
			/name:\s*"suggest_redlines"[\s\S]{0,400}mutating:\s*false/,
		);
	});

	it("only proposes redlines for deviating clauses via suggestRedlineForClause", () => {
		expect(source).toContain("suggestRedlineForClause(");
		expect(source).toMatch(
			/name:\s*"suggest_redlines"[\s\S]{0,4000}proposals only/i,
		);
	});
});
