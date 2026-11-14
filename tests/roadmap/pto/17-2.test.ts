import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 17.2 generate_question_bank tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "generate_question_bank"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers generate_question_bank", () => {
		expect(source).toMatch(/name:\s*"generate_question_bank"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
