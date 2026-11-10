import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.2 ask_contract tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers ask_contract gated by contracts.view", () => {
		expect(source).toMatch(/name:\s*"ask_contract"/);
		expect(source).toMatch(
			/name:\s*"ask_contract"[\s\S]{0,200}PERMISSIONS\.CONTRACTS\.VIEW/,
		);
	});

	it("returns citations alongside the answer", () => {
		expect(source).toMatch(
			/name:\s*"ask_contract"[\s\S]{0,2000}citations:\s*answer\.citations/,
		);
	});
});
