import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 7.4 link_contract_to_funding tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/fundingTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "link_contract_to_funding"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers link_contract_to_funding gated by both contracts.edit and funding.manage, and is mutating", () => {
		expect(source).toMatch(/name:\s*"link_contract_to_funding"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONTRACTS\.EDIT/);
		expect(toolBlock).toMatch(/PERMISSIONS\.FUNDING\.MANAGE/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("validates the contract and fund are in this org before linking, and audits", () => {
		expect(toolBlock).toContain("loadContractForOrg(");
		expect(toolBlock).toContain("assertFundInOrg(");
		expect(toolBlock).toContain("setGrantFundIdForContract(");
		expect(toolBlock).toContain("auditFunding(");
	});
});
