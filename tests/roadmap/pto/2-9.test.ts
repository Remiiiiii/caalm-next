import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.9 check_playbook_deviations tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers check_playbook_deviations gated by contracts.review and is read-only", () => {
		expect(source).toMatch(/name:\s*"check_playbook_deviations"/);
		expect(source).toMatch(
			/name:\s*"check_playbook_deviations"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.REVIEW/,
		);
		expect(source).toMatch(
			/name:\s*"check_playbook_deviations"[\s\S]{0,400}mutating:\s*false/,
		);
	});

	it("wraps scoreOrgContractDeviations with the contract text", () => {
		expect(source).toContain("scoreOrgContractDeviations(");
	});
});
