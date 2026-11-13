import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.2 list_findings tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_findings"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_findings gated by audit.documents_view and is read-only", () => {
		expect(source).toMatch(/name:\s*"list_findings"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.DOCUMENTS_VIEW/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("wraps getFinding/listFindings, org-scoped", () => {
		expect(toolBlock).toContain("getFinding(");
		expect(toolBlock).toContain("listFindings(");
	});
});
