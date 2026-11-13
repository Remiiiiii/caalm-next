import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 9.1 invite_event_attendees tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/calendarTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "invite_event_attendees"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers invite_event_attendees gated by events.invite and is mutating", () => {
		expect(source).toMatch(/name:\s*"invite_event_attendees"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.EVENTS\.INVITE/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("appends to the existing event and notifies only the newly-added people", () => {
		expect(toolBlock).toContain("updateCalendarEvent(");
		expect(toolBlock).toContain("notifyMeetingInvitees(");
		expect(toolBlock).toContain("newParticipants");
	});
});
