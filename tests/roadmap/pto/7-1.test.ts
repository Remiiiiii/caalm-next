import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 7.1 search_funding tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/fundingTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "search_funding"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers search_funding gated by funding.view and is read-only", () => {
		expect(source).toMatch(/name:\s*"search_funding"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.FUNDING\.VIEW/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("wraps the funding pursuit lookup and is org-scoped", () => {
		expect(toolBlock).toContain("listPursuits(");
		expect(toolBlock).toContain("getPursuitById(");
		expect(toolBlock).toContain("ctx.orgId");
	});
});
