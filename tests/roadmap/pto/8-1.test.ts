import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 8.1 search_constituents tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/constituentTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "search_constituents"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers search_constituents", () => {
		expect(source).toMatch(/name:\s*"search_constituents"/);
	});

	it("gates read with constituents.view and create with constituents.manage, auditing create", () => {
		expect(toolBlock).toContain("listConstituents(");
		expect(toolBlock).toContain("createConstituentWithDuplicateGate(");
		expect(toolBlock).toMatch(/PERMISSIONS\.CONSTITUENTS\.VIEW/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONSTITUENTS\.MANAGE/);
		expect(toolBlock).toContain("auditNonprofit(");
	});
});
