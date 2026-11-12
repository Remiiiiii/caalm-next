import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.17 export_contract tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers export_contract gated by contracts.view and is read-only", () => {
		expect(source).toMatch(/name:\s*"export_contract"/);
		expect(source).toMatch(
			/name:\s*"export_contract"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.VIEW/,
		);
		expect(source).toMatch(
			/name:\s*"export_contract"[\s\S]{0,400}mutating:\s*false/,
		);
	});

	it("wraps the existing file link rather than generating a new export, and audits it", () => {
		expect(source).toContain("This contract has no file to export yet.");
		expect(source).toMatch(
			/name:\s*"export_contract"[\s\S]{0,4000}action:\s*"export"/,
		);
	});
});
