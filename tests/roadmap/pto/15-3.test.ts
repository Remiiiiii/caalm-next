import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 15.3 explain_why_denied tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/agentOsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "explain_why_denied"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers explain_why_denied as read-only", () => {
		expect(source).toMatch(/name:\s*"explain_why_denied"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
	});

	it("maps the missing permission to a plain-English name/description and never bypasses it", () => {
		expect(toolBlock).toContain("plainPermissionLabel(");
		expect(toolBlock).toContain("Ask your org admin to grant it");
		expect(toolBlock).not.toContain("ctx.permissions.push");
	});
});
