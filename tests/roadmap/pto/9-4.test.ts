import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 9.4 create_public_event tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/calendarTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_public_event"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_public_event gated by events.create and is mutating", () => {
		expect(source).toMatch(/name:\s*"create_public_event"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.EVENTS\.CREATE/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("creates the event with a ticket type and lists registrations org-scoped", () => {
		expect(toolBlock).toContain("createTicketType(");
		expect(toolBlock).toContain("listRegistrationsForEvent(");
		expect(toolBlock).toContain("getCalendarEventInOrg(");
	});
});
