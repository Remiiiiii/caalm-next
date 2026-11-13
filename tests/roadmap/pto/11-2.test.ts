import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 11.2 assign_ticket tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/ticketTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "assign_ticket"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers assign_ticket and is mutating, gated by tickets.assign", () => {
		expect(source).toMatch(/name:\s*"assign_ticket"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
		expect(toolBlock).toContain("PERMISSIONS.TICKETS.ASSIGN");
	});

	it("wraps assignTicket and audits", () => {
		expect(toolBlock).toContain("assignTicket(");
		expect(toolBlock).toContain("logAuditEvent(");
	});
});
