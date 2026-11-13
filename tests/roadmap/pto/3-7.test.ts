import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 3.7 assign_license_owner tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/licenseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "assign_license_owner"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers assign_license_owner gated by licenses.edit", () => {
		expect(source).toMatch(/name:\s*"assign_license_owner"/);
		expect(source).toMatch(
			/name:\s*"assign_license_owner"[\s\S]{0,300}PERMISSIONS\.LICENSES\.EDIT/,
		);
		expect(registry).toContain("...LICENSE_TOOLS");
	});

	it("has mutating: true, wraps transferLicenseOwnership, and audits", () => {
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toMatch(/transferLicenseOwnership\(/);
		expect(toolBlock).toMatch(/auditLicense/);
	});
});
