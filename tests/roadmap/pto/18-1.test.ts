import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 18.1 generate_evidence_request_list tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "generate_evidence_request_list"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers generate_evidence_request_list", () => {
		expect(source).toMatch(/name:\s*"generate_evidence_request_list"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
