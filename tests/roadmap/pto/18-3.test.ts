import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 18.3 update_evidence_status tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "update_evidence_status"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers update_evidence_status", () => {
		expect(source).toMatch(/name:\s*"update_evidence_status"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
