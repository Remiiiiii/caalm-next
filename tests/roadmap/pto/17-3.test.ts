import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 17.3 add_question tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "add_question"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers add_question", () => {
		expect(source).toMatch(/name:\s*"add_question"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
