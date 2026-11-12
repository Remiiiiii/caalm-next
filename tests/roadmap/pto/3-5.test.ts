import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 3.5 extract_license_from_document tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/licenseTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "extract_license_from_document"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers extract_license_from_document gated by licenses.edit", () => {
		expect(source).toMatch(/name:\s*"extract_license_from_document"/);
		expect(source).toMatch(
			/name:\s*"extract_license_from_document"[\s\S]{0,700}PERMISSIONS\.LICENSES\.EDIT/,
		);
		expect(registry).toContain("...LICENSE_TOOLS");
	});

	it("has mutating: false and the expected backend call", () => {
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toMatch(/extractLicenseFromDocument/);
		const handler = toolBlock;
		expect(handler).toMatch(/nothing was saved/i);
		expect(handler).not.toMatch(
			/createLicense|updateLicense|logAuditEvent|auditLicense/,
		);
	});
});
