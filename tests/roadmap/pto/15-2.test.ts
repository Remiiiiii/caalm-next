import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 15.2 undo_last_action tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/agentOsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "undo_last_action"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers undo_last_action as mutating and gated on users.deactivate", () => {
		expect(source).toMatch(/name:\s*"undo_last_action"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("PERMISSIONS.USERS.DEACTIVATE");
	});

	it("only reverses a captured, still-current reactivate/deactivate toggle, and audits the undo", () => {
		expect(toolBlock).toContain("findUndoableAction(");
		expect(toolBlock).toContain("row.status !== meta.nextStatus");
		expect(toolBlock).toContain("updateUserProfile(");
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
