import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.14 approve_contract tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers approve_contract gated by contracts.approve and is mutating", () => {
		expect(source).toMatch(/name:\s*"approve_contract"/);
		expect(source).toMatch(
			/name:\s*"approve_contract"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.APPROVE/,
		);
		expect(source).toMatch(
			/name:\s*"approve_contract"[\s\S]{0,400}mutating:\s*true/,
		);
	});

	it("checks viewer capability before deciding, wraps decide(), and audits", () => {
		expect(source).toContain("getWorkflowForViewer(");
		expect(source).toContain("canDecideAsAssignee");
		expect(source).toMatch(
			/name:\s*"approve_contract"[\s\S]{0,4000}logAuditEvent/,
		);
	});
});
