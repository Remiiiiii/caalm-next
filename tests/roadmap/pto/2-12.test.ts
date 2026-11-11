import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.12 send_counterparty_invite tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers send_counterparty_invite gated by contracts.edit and is mutating", () => {
		expect(source).toMatch(/name:\s*"send_counterparty_invite"/);
		expect(source).toMatch(
			/name:\s*"send_counterparty_invite"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.EDIT/,
		);
		expect(source).toMatch(
			/name:\s*"send_counterparty_invite"[\s\S]{0,400}mutating:\s*true/,
		);
	});

	it("wraps createAccess and emails the invite via mailgunService, and audits", () => {
		expect(source).toContain("createAccess({");
		expect(source).toContain("mailgunService.sendEmail({");
		expect(source).toMatch(
			/name:\s*"send_counterparty_invite"[\s\S]{0,4000}logAuditEvent/,
		);
	});
});
