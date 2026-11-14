import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 15.4 list_my_capabilities tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/agentOsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_my_capabilities"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_my_capabilities as read-only", () => {
		expect(source).toMatch(/name:\s*"list_my_capabilities"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("reflects getToolsForPermissions for the caller", () => {
		expect(toolBlock).toContain("getToolsForPermissions(ctx.permissions)");
	});
});
