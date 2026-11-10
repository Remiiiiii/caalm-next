import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.4 update_contract_fields tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);
	const service = readFileSync(
		join(
			process.cwd(),
			"src/lib/api/contracts/services/ContractFieldUpdateService.ts",
		),
		"utf8",
	);

	it("registers update_contract_fields gated by contracts.edit and marked mutating", () => {
		expect(source).toMatch(/name:\s*"update_contract_fields"/);
		expect(source).toMatch(
			/name:\s*"update_contract_fields"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.EDIT/,
		);
		expect(source).toMatch(
			/name:\s*"update_contract_fields"[\s\S]{0,400}mutating:\s*true/,
		);
	});

	it("the field update service is org-scoped and allowlisted", () => {
		expect(service).toContain("orgId !== input.orgId");
		expect(service).toMatch(/ALLOWED_FIELDS/);
	});
});
