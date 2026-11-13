import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 11.3 search_runbooks tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/itTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "search_runbooks"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers search_runbooks and is read-only, gated by it.view_runbooks", () => {
		expect(source).toMatch(/name:\s*"search_runbooks"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("PERMISSIONS.IT.VIEW_RUNBOOKS");
	});

	it("searches org-scoped runbooks and can return a step", () => {
		expect(toolBlock).toContain("listRunbooks(ctx.orgId");
		expect(toolBlock).toContain("getRunbook(ctx.orgId");
		expect(toolBlock).toContain("item.steps[stepIndex]");
	});
});
