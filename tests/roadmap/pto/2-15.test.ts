import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.15 renew_contract tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers renew_contract gated by contracts.edit and is mutating", () => {
		expect(source).toMatch(/name:\s*"renew_contract"/);
		expect(source).toMatch(
			/name:\s*"renew_contract"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.EDIT/,
		);
		expect(source).toMatch(
			/name:\s*"renew_contract"[\s\S]{0,400}mutating:\s*true/,
		);
	});

	it("wraps renewContractAfterExpiry, never auto-renewing without a human call", () => {
		expect(source).toContain("renewContractAfterExpiry({");
	});
});
