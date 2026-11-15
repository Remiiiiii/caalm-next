import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 18.4 evidence_coverage_report tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "evidence_coverage_report"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers evidence_coverage_report", () => {
		expect(source).toMatch(/name:\s*"evidence_coverage_report"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});
});
