import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.11 list_contract_obligations tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers list_contract_obligations gated by contracts.view and is read-only", () => {
		expect(source).toMatch(/name:\s*"list_contract_obligations"/);
		expect(source).toMatch(
			/name:\s*"list_contract_obligations"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.VIEW/,
		);
		expect(source).toMatch(
			/name:\s*"list_contract_obligations"[\s\S]{0,400}mutating:\s*false/,
		);
	});

	it("wraps listObligations org-scoped by contractId", () => {
		expect(source).toContain("listObligations({");
	});
});
