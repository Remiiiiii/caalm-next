import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.10 event roster export", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.10",
	);

	it("is catalogued as roster export", () => {
		expect(task?.title).toMatch(/roster export/i);
	});

	it("exports CSV without gift amount column", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/events/[eventId]/registrations/export/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/name,ticket_type,checked_in/);
		expect(route).not.toMatch(/amount/);
		expect(route).toMatch(/getCalendarEventInOrg/);
	});

	it("offers export from registrations tab", () => {
		const panel = readFileSync(
			join(
				process.cwd(),
				"src/components/calendar/EventRegistrationsPanel.tsx",
			),
			"utf8",
		);
		expect(panel).toMatch(/registrations\/export/);
	});
});
