import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.5 capacity and waitlist booking", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.5",
	);

	it("is catalogued as waitlist booking", () => {
		expect(task?.title).toMatch(/Capacity and waitlist/i);
	});

	it("assigns waitlist when shift is at capacity", () => {
		const repo = readFileSync(
			join(
				process.cwd(),
				"src/lib/volunteers/shift-bookings.repository.ts",
			),
			"utf8",
		);
		expect(repo).toMatch(/waitlist/);
		expect(repo).toMatch(/shiftCapacity/);
	});

	it("audit-logs waitlist promotion", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/volunteers/shifts/[eventId]/bookings/[bookingId]/promote/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/logAuditEvent/);
		expect(route).toMatch(/promoteWaitlistBooking/);
	});
});
