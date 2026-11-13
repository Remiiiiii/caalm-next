import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 11.1 create_ticket tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/ticketTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_ticket"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_ticket and is mutating", () => {
		expect(source).toMatch(/name:\s*"create_ticket"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("creates via intakeTicket, confirms/audits, and supports org-scoped get/list", () => {
		expect(toolBlock).toContain("intakeTicket(");
		expect(toolBlock).toContain("logAuditEvent(");
		expect(toolBlock).toContain("listTickets(");
		expect(toolBlock).toContain("resolveTicket(");
		expect(toolBlock).toContain("PERMISSIONS.TICKETS.CREATE");
		expect(toolBlock).toContain("PERMISSIONS.TICKETS.VIEW");
	});
});
