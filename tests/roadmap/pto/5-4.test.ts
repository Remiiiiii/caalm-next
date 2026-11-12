import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 5.4 list_contract_templates tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/clauseTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_contract_templates"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_contract_templates", () => {
		expect(source).toMatch(/name:\s*"list_contract_templates"/);
	});

	it("gates list/create/update/archive by the matching contract_templates permission, and audits writes", () => {
		expect(toolBlock).toContain("listTemplates(");
		expect(toolBlock).toContain("createTemplate(");
		expect(toolBlock).toContain("updateTemplate(");
		expect(toolBlock).toContain("archiveTemplate(");
		expect(toolBlock).toMatch(/PERMISSIONS\.CONTRACT_TEMPLATES\.VIEW/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONTRACT_TEMPLATES\.CREATE/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONTRACT_TEMPLATES\.EDIT/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONTRACT_TEMPLATES\.DELETE/);
		expect(toolBlock).toContain("auditLibrary(");
	});
});
