import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 19.4 find_rehearsal_gaps tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "find_rehearsal_gaps"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers find_rehearsal_gaps", () => {
		expect(source).toMatch(/name:\s*"find_rehearsal_gaps"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});
});
