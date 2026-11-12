import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 4.3 reassign_approval tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/approvalTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "reassign_approval"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers reassign_approval gated by approvals.override and is mutating", () => {
		expect(source).toMatch(/name:\s*"reassign_approval"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.APPROVALS\.OVERRIDE/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("wraps reassignCurrentStep/reassignLicenseCurrentStep with adminOverride, and audits", () => {
		expect(toolBlock).toContain("reassignCurrentStep({");
		expect(toolBlock).toContain("reassignLicenseCurrentStep({");
		expect(toolBlock).toContain("adminOverride: true");
		expect(toolBlock).toMatch(/action:\s*"approval_reassigned"/);
	});
});
