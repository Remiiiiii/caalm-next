import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 3.4 approve_license tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/licenseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "approve_license"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers approve_license gated by licenses.approve", () => {
		expect(source).toMatch(/name:\s*"approve_license"/);
		expect(source).toMatch(
			/name:\s*"approve_license"[\s\S]{0,700}PERMISSIONS\.LICENSES\.APPROVE/,
		);
		expect(registry).toContain("...LICENSE_TOOLS");
	});

	it("has mutating: true and the expected backend call", () => {
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toMatch(/decideLicense/);
		expect(toolBlock).toMatch(/getLicenseWorkflowForViewer/);
		expect(toolBlock).toMatch(/canDecideAsAssignee/);
		expect(toolBlock).toMatch(/isAdminOverride:\s*false/);
		expect(toolBlock).toMatch(/auditLicense/);
	});
});
