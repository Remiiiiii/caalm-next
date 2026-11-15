import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 17.5 generate_interview_script tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "generate_interview_script"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers generate_interview_script", () => {
		expect(source).toMatch(/name:\s*"generate_interview_script"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
