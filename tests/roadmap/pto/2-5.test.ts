import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.5 bulk_update_contracts tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers bulk_update_contracts gated by contracts.edit", () => {
		expect(source).toMatch(/name:\s*"bulk_update_contracts"/);
		expect(source).toMatch(
			/name:\s*"bulk_update_contracts"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.EDIT/,
		);
	});

	it("is a gated stub with no mutation loop (not available yet, zero writes)", () => {
		const toolBlock = source.slice(
			source.indexOf('name: "bulk_update_contracts"'),
		);
		expect(toolBlock).toMatch(/not available yet/i);
		expect(toolBlock).toContain("succeeded: 0");
		expect(toolBlock).toContain("failed: 0");
		expect(toolBlock).not.toMatch(
			/updateRow|ContractFieldUpdateService\.updateContractFields/,
		);
	});
});
