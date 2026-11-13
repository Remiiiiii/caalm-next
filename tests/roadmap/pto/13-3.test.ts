import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 13.3 send_sms_test tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/newsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "send_sms_test"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers send_sms_test and is mutating, admin-gated", () => {
		expect(source).toMatch(/name:\s*"send_sms_test"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("PERMISSIONS.SETTINGS.EDIT");
	});

	it("only sends to the caller's own on-file number via twilioService, and audits", () => {
		expect(toolBlock).toContain("getNotificationSettings(");
		expect(toolBlock).toContain("settings?.phone_number");
		expect(toolBlock).toContain("sendSMS(");
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
