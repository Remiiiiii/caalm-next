import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 16.3 reschedule_review_session tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "reschedule_review_session"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers reschedule_review_session", () => {
		expect(source).toMatch(/name:\s*"reschedule_review_session"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});
});
