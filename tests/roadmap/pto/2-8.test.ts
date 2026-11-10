import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.8 compare_contract_versions tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers compare_contract_versions gated by contracts.view and is org-scoped read-only", () => {
		expect(source).toMatch(/name:\s*"compare_contract_versions"/);
		expect(source).toMatch(
			/name:\s*"compare_contract_versions"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.VIEW/,
		);
		expect(source).toMatch(
			/name:\s*"compare_contract_versions"[\s\S]{0,400}mutating:\s*false/,
		);
		expect(source).toContain("v.orgId === ctx.orgId");
	});

	it("diffs two versions via listVersions", () => {
		expect(source).toContain("listVersions(contract.contractId)");
		expect(source).toContain("diffLines(");
	});
});
