import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 3.6 list_license_expirations tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/licenseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_license_expirations"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_license_expirations gated by licenses.view", () => {
		expect(source).toMatch(/name:\s*"list_license_expirations"/);
		expect(source).toMatch(
			/name:\s*"list_license_expirations"[\s\S]{0,300}PERMISSIONS\.LICENSES\.VIEW/,
		);
		expect(registry).toContain("...LICENSE_TOOLS");
	});

	it("is read-only and wraps LicenseService.getExpiringLicenses, org-scoped", () => {
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toMatch(
			/LicenseService\.getExpiringLicenses\(\s*\n?\s*ctx\.orgId/,
		);
	});
});
