import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.6 upload_cap_evidence tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "upload_cap_evidence"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers upload_cap_evidence gated by audit.manage_caps and is mutating", () => {
		expect(source).toMatch(/name:\s*"upload_cap_evidence"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.MANAGE_CAPS/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("validates the file and audits the attach", () => {
		expect(toolBlock).toContain("assertCapEvidenceFile(");
		expect(toolBlock).toContain("updateCap(");
		expect(toolBlock).toContain("logAuditUploadEvent(");
	});
});
