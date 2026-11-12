import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 4.4 override_approval tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/approvalTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "override_approval"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers override_approval gated by approvals.override only, and is mutating", () => {
		expect(source).toMatch(/name:\s*"override_approval"/);
		expect(toolBlock).toMatch(
			/requiredPermissions:\s*\[PERMISSIONS\.APPROVALS\.OVERRIDE\]/,
		);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("always requires notes, audits, and dispatches to overrideCompletedWorkflow or decide(adminOverride)", () => {
		expect(toolBlock).toContain("Notes are required for an admin override");
		expect(toolBlock).toContain("overrideCompletedWorkflow({");
		expect(toolBlock).toContain("overrideCompletedLicenseWorkflow({");
		expect(toolBlock).toContain("adminOverride: true");
		expect(toolBlock).toMatch(/action:\s*"approval_decided"/);
	});
});
