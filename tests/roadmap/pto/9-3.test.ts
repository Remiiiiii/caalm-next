import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 9.3 share_calendar tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/calendarTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "share_calendar"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers share_calendar gated by calendar.create", () => {
		expect(source).toMatch(/name:\s*"share_calendar"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.CALENDAR\.CREATE/);
	});

	it("lists shared calendars org-scoped and refuses cross-org sharing", () => {
		expect(toolBlock).toContain("getCalendarsSharedWithUser(");
		expect(toolBlock).toContain("sharePrimaryCalendarWithUser(");
		expect(toolBlock).toMatch(/not in this organization/i);
	});
});
