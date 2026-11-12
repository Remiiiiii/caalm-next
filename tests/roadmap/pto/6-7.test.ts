import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.7 list_open_caps tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_open_caps"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_open_caps gated by audit.documents_view and is read-only", () => {
		expect(source).toMatch(/name:\s*"list_open_caps"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.DOCUMENTS_VIEW/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("wraps listCaps and is org-scoped", () => {
		expect(toolBlock).toContain("listCaps(");
		expect(toolBlock).toContain("ctx.orgId");
	});
});
