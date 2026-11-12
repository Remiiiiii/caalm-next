import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 3.2 create_license tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/licenseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_license"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_license gated by licenses.create", () => {
		expect(source).toMatch(/name:\s*"create_license"/);
		expect(source).toMatch(
			/name:\s*"create_license"[\s\S]{0,700}PERMISSIONS\.LICENSES\.CREATE/,
		);
		expect(registry).toContain("...LICENSE_TOOLS");
	});

	it("has mutating: true and the expected backend call", () => {
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toMatch(/LicenseService\.createLicense/);
		expect(source).toMatch(/LicenseService\.updateLicense/);
		expect(toolBlock).toMatch(/auditLicense/);
	});
});
