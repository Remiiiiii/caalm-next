import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 9.2 approve_calendar_request tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/calendarTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "approve_calendar_request"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers approve_calendar_request gated by events.approve and is mutating", () => {
		expect(source).toMatch(/name:\s*"approve_calendar_request"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.EVENTS\.APPROVE/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("wraps the real decision API and verifies the event is in this org before deciding", () => {
		expect(toolBlock).toContain("decideCalendarApprovalRequest(");
		expect(toolBlock).toContain("getCalendarEventInOrg(");
	});
});
