import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 12.2 send_outlook_mail tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/integrationTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "send_outlook_mail"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers send_outlook_mail and is mutating, gated by integrations.outlook.connect", () => {
		expect(source).toMatch(/name:\s*"send_outlook_mail"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT");
	});

	it("sends via the user's own connected Outlook mailbox and audits", () => {
		expect(toolBlock).toContain("getValidOutlookMailAccessToken(ctx.user.$id)");
		expect(toolBlock).toContain("sendOutlookMessage(");
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
