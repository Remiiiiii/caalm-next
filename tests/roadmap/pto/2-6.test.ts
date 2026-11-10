import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.6 extract_contract_terms tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers extract_contract_terms gated by contracts.edit and never auto-saves", () => {
		expect(source).toMatch(/name:\s*"extract_contract_terms"/);
		expect(source).toMatch(
			/name:\s*"extract_contract_terms"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.EDIT/,
		);
		expect(source).toMatch(
			/name:\s*"extract_contract_terms"[\s\S]{0,400}mutating:\s*false/,
		);
	});

	it("wraps extractContractFromDocument and never calls updateRow", () => {
		expect(source).toContain("extractContractFromDocument(");
		expect(source).toMatch(
			/name:\s*"extract_contract_terms"[\s\S]{0,3000}nothing was saved/i,
		);
	});
});
