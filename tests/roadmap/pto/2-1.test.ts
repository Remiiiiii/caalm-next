import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.1 get_contract tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);

	it("registers get_contract gated by contracts.view", () => {
		expect(source).toMatch(/name:\s*"get_contract"/);
		expect(source).toMatch(
			/name:\s*"get_contract"[\s\S]{0,200}PERMISSIONS\.CONTRACTS\.VIEW/,
		);
	});

	it("is wired into the assistant tool registry", () => {
		expect(registry).toContain("CONTRACT_TOOLS");
	});
});
