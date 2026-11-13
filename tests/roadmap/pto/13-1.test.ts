import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 13.1 get_morning_briefing tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/newsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "get_morning_briefing"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers get_morning_briefing and is read-only, gated by ai.chat", () => {
		expect(source).toMatch(/name:\s*"get_morning_briefing"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("PERMISSIONS.AI.CHAT");
	});

	it("combines world briefing with org-scoped company news", () => {
		expect(toolBlock).toContain("fetchBriefing(");
		expect(toolBlock).toContain("listNewsArticles(");
		expect(toolBlock).toContain("ctx.orgId");
	});
});
