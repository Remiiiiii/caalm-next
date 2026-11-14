import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 17.4 import_questions_from_findings tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "import_questions_from_findings"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers import_questions_from_findings", () => {
		expect(source).toMatch(/name:\s*"import_questions_from_findings"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
