import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.8 draft_verification_note tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "draft_verification_note"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers draft_verification_note gated by audit.manage_caps and is non-mutating", () => {
		expect(source).toMatch(/name:\s*"draft_verification_note"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.MANAGE_CAPS/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("stages text only and never closes a CAP", () => {
		expect(toolBlock).toContain("staged: true");
		expect(toolBlock).not.toContain("updateCap(");
		expect(toolBlock).toMatch(/Mark closed/);
	});
});
