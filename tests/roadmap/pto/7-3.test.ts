import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 7.3 create_proposal tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/fundingTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_proposal"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_proposal and is mutating", () => {
		expect(source).toMatch(/name:\s*"create_proposal"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("creates under proposals.create and updates status under proposals.edit, auditing both", () => {
		expect(toolBlock).toContain("createProposal(");
		expect(toolBlock).toContain("updateProposal(");
		expect(toolBlock).toMatch(/PERMISSIONS\.PROPOSALS\.CREATE/);
		expect(toolBlock).toMatch(/PERMISSIONS\.PROPOSALS\.EDIT/);
		expect(toolBlock).toContain("auditFunding(");
	});
});
