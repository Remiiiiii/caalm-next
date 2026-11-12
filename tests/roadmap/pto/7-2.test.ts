import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 7.2 list_funding_obligations tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/fundingTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_funding_obligations"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_funding_obligations", () => {
		expect(source).toMatch(/name:\s*"list_funding_obligations"/);
	});

	it("lists under funding.view and gates completion with funding.manage, auditing the complete", () => {
		expect(toolBlock).toContain("listObligations(");
		expect(toolBlock).toContain("updateObligation(");
		expect(toolBlock).toMatch(/PERMISSIONS\.FUNDING\.VIEW/);
		expect(toolBlock).toMatch(/PERMISSIONS\.FUNDING\.MANAGE/);
		expect(toolBlock).toContain("auditFunding(");
	});
});
