import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 15.1 preview_mutation tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/agentOsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "preview_mutation"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers preview_mutation as read-only", () => {
		expect(source).toMatch(/name:\s*"preview_mutation"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("refuses to preview non-mutating tools or tools the caller can't run, and never writes", () => {
		expect(toolBlock).toContain("target.mutating");
		expect(toolBlock).toContain("requiredPermissions.filter");
		expect(toolBlock).toContain("Preview only");
	});
});
