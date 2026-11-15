import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 19.1 start_practice_round tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "start_practice_round"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers start_practice_round", () => {
		expect(source).toMatch(/name:\s*"start_practice_round"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
