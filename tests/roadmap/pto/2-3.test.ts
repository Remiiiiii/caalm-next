import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.3 create_contract tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers create_contract gated by contracts.create and marked mutating", () => {
		expect(source).toMatch(/name:\s*"create_contract"/);
		expect(source).toMatch(
			/name:\s*"create_contract"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.CREATE/,
		);
		expect(source).toMatch(
			/name:\s*"create_contract"[\s\S]{0,400}mutating:\s*true/,
		);
	});

	it("requires a known blueprintId and audits the create", () => {
		expect(source).toContain("isBlueprintId(blueprintId)");
		expect(source).toMatch(
			/name:\s*"create_contract"[\s\S]{0,4000}logAuditEvent/,
		);
	});
});
