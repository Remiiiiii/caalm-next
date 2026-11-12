import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 10.2 list_my_tasks tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/taskTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_my_tasks"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_my_tasks and is read-only, scoped to the caller", () => {
		expect(source).toMatch(/name:\s*"list_my_tasks"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("ctx.user.$id");
	});

	it("supports an overdue-only filter", () => {
		expect(toolBlock).toContain("isTaskOverdue(");
		expect(toolBlock).toContain("overdueOnly");
	});
});
