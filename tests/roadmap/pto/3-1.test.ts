import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 3.1 get_license tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/licenseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "get_license"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers get_license gated by licenses.view", () => {
		expect(source).toMatch(/name:\s*"get_license"/);
		expect(source).toMatch(
			/name:\s*"get_license"[\s\S]{0,700}PERMISSIONS\.LICENSES\.VIEW/,
		);
		expect(registry).toContain("...LICENSE_TOOLS");
	});

	it("has mutating: false and the expected backend call", () => {
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toMatch(
			/LicenseService\.getLicenseByIdForOrg|resolveOneLicense/,
		);
		expect(toolBlock).not.toMatch(/logAuditEvent|auditLicense/);
	});
});
