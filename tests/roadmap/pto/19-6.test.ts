import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 19.6 department_readiness_summary tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "department_readiness_summary"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers department_readiness_summary", () => {
		expect(source).toMatch(/name:\s*"department_readiness_summary"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});
});
