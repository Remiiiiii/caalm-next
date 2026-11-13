import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 8.6 compute_suggested_ask tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/constituentTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "compute_suggested_ask"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers compute_suggested_ask gated by constituents.view and is read-only", () => {
		expect(source).toMatch(/name:\s*"compute_suggested_ask"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CONSTITUENTS\.VIEW/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("wraps computeSuggestedAsk, is org-scoped, and explains the basis", () => {
		expect(toolBlock).toContain("computeSuggestedAsk(");
		expect(toolBlock).toContain("ctx.orgId");
		expect(toolBlock).toContain("basis:");
	});
});
