import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.7 summarize_contract tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers summarize_contract gated by contracts.view and is read-only", () => {
		expect(source).toMatch(/name:\s*"summarize_contract"/);
		expect(source).toMatch(
			/name:\s*"summarize_contract"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.VIEW/,
		);
		expect(source).toMatch(
			/name:\s*"summarize_contract"[\s\S]{0,400}mutating:\s*false/,
		);
	});

	it("wraps analyzeContractDocument and returns citations", () => {
		expect(source).toContain("analyzeContractDocument(");
		expect(source).toMatch(
			/name:\s*"summarize_contract"[\s\S]{0,2000}citations:\s*analysis\.citations/,
		);
	});
});
