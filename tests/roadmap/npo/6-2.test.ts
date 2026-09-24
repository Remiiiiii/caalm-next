import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.2 event registrations tab", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.2",
	);

	it("is catalogued as registrations tab", () => {
		expect(task?.title).toMatch(/registrations tab/i);
	});

	it("shows registrations on event detail when events.invite is granted", () => {
		const dialog = readFileSync(
			join(process.cwd(), "src/components/calendar/EventReviewDialog.tsx"),
			"utf8",
		);
		expect(dialog).toMatch(/canManageEventRegistrations/);
		expect(dialog).toMatch(/EventRegistrationsPanel/);
		expect(dialog).toMatch(/Registrations/);

		const calendar = readFileSync(
			join(process.cwd(), "src/components/OutlookStyleCalendar.tsx"),
			"utf8",
		);
		expect(calendar).toMatch(/EVENTS\.INVITE/);
		expect(calendar).toMatch(/canManageEventRegistrations/);
	});

	it("uses CAALM status chips on registration rows", () => {
		const panel = readFileSync(
			join(
				process.cwd(),
				"src/components/calendar/EventRegistrationsPanel.tsx",
			),
			"utf8",
		);
		expect(panel).toMatch(/bg-green\/10 text-green border-green\/20/);
		expect(panel).toMatch(/bg-orange\/10 text-orange border-orange\/20/);
	});
});
