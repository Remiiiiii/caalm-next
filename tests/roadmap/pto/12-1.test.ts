import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 12.1 send_gmail tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/integrationTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "send_gmail"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers send_gmail and is mutating, gated by integrations.gmail.manage", () => {
		expect(source).toMatch(/name:\s*"send_gmail"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("PERMISSIONS.INTEGRATIONS.GMAIL_MANAGE");
	});

	it("sends via the user's own connected Gmail mailbox and audits", () => {
		expect(toolBlock).toContain("getValidGmailAccessToken(ctx.user.$id)");
		expect(toolBlock).toContain("sendGmailMessage(");
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
