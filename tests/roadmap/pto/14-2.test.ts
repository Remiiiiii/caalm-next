import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 14.2 export_table_csv tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/analyticsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "export_table_csv"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers export_table_csv as mutating and gated on funding.view", () => {
		expect(source).toMatch(/name:\s*"export_table_csv"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("PERMISSIONS.FUNDING.VIEW");
	});

	it("wraps the real funding journal export, audits the export, and refuses other tables honestly (2a rule)", () => {
		expect(toolBlock).toContain("buildJournalExport(");
		expect(toolBlock).toContain("journalExportToCsv(");
		expect(toolBlock).toContain('action: "export"');
		expect(toolBlock).toContain("logAuditEvent(");
		expect(toolBlock).toContain("isn't available for that table yet");
	});
});
