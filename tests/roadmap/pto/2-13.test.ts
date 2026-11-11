import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.13 send_for_signature tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers send_for_signature gated by contracts.sign and is mutating", () => {
		expect(source).toMatch(/name:\s*"send_for_signature"/);
		expect(source).toMatch(
			/name:\s*"send_for_signature"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.SIGN/,
		);
		expect(source).toMatch(
			/name:\s*"send_for_signature"[\s\S]{0,400}mutating:\s*true/,
		);
	});

	it("wraps createEnvelope + sendEnvelope and audits the send", () => {
		expect(source).toContain("createEnvelope({");
		expect(source).toContain("sendEnvelope(envelope.$id)");
		expect(source).toMatch(
			/name:\s*"send_for_signature"[\s\S]{0,4000}logAuditEvent/,
		);
	});
});
