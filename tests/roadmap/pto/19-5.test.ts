import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 19.5 session_readiness_report tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "session_readiness_report"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers session_readiness_report", () => {
		expect(source).toMatch(/name:\s*"session_readiness_report"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});
});
