import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 17.1 assign_session_role tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "assign_session_role"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers assign_session_role", () => {
		expect(source).toMatch(/name:\s*"assign_session_role"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
