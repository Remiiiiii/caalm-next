import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 12.4 sync_outlook_calendar tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/integrationTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "sync_outlook_calendar"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers sync_outlook_calendar and is mutating, gated by integrations.outlook.sync", () => {
		expect(source).toMatch(/name:\s*"sync_outlook_calendar"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC");
	});

	it("checks the user's real Outlook calendar connection before answering", () => {
		expect(toolBlock).toContain(
			'getValidIntegration(ctx.user.$id, "microsoft")',
		);
	});
});
