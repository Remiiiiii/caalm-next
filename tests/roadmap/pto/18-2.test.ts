import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 18.2 assign_evidence_owner tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "assign_evidence_owner"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers assign_evidence_owner", () => {
		expect(source).toMatch(/name:\s*"assign_evidence_owner"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
