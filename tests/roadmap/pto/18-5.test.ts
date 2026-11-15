import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 18.5 who_owns_evidence tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "who_owns_evidence"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers who_owns_evidence", () => {
		expect(source).toMatch(/name:\s*"who_owns_evidence"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});
});
