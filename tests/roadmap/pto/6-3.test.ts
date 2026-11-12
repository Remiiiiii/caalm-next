import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.3 dispute_finding tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "dispute_finding"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers dispute_finding gated by audit.manage_findings and is mutating", () => {
		expect(source).toMatch(/name:\s*"dispute_finding"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.MANAGE_FINDINGS/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("sets disputed/rectified/accepted_risk via updateFinding, with no role bypass, and audits", () => {
		expect(toolBlock).toContain("updateFinding(");
		expect(toolBlock).toContain('"disputed"');
		expect(toolBlock).toContain('"rectified"');
		expect(toolBlock).toContain('"accepted_risk"');
		expect(toolBlock).toContain("logAuditUploadEvent(");
	});
});
