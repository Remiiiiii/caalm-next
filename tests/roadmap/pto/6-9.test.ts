import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.9 export_audit_report tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "export_audit_report"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers export_audit_report gated by audit.documents_view and is read-only", () => {
		expect(source).toMatch(/name:\s*"export_audit_report"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.DOCUMENTS_VIEW/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("is an honest gated stub: no export backend exists yet", () => {
		expect(toolBlock).toContain("available: false");
		expect(toolBlock).toMatch(/not available/i);
	});
});
