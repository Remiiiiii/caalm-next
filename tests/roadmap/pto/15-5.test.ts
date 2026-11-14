import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 15.5 compose_skill_multi_step tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/agentOsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "compose_skill_multi_step"');
	const toolBlock = source.slice(start);

	it("registers compose_skill_multi_step as mutating", () => {
		expect(source).toMatch(/name:\s*"compose_skill_multi_step"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("only orchestrates a fixed set of existing ToolDefinitions via runToolByName, checks the union of permissions up front, and audits", () => {
		expect(source).toContain("NAMED_SKILLS");
		expect(toolBlock).toContain("runToolByName(");
		expect(toolBlock).toContain("allRequired");
		expect(toolBlock).toContain("logAuditEvent(");
		expect(toolBlock).toContain("isn't a defined skill yet");
	});
});
