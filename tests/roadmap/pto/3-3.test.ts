import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 3.3 renew_license tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/licenseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "renew_license"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers renew_license gated by licenses.edit", () => {
		expect(source).toMatch(/name:\s*"renew_license"/);
		expect(source).toMatch(
			/name:\s*"renew_license"[\s\S]{0,700}PERMISSIONS\.LICENSES\.EDIT/,
		);
		expect(registry).toContain("...LICENSE_TOOLS");
	});

	it("has mutating: true and the expected backend call", () => {
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toMatch(/LicenseService\.renewLicense/);
		expect(toolBlock).toMatch(/auditLicense/);
	});
});
