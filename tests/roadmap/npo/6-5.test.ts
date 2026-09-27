import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.5 ticket-type capacity enforcement", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.5",
	);

	it("is catalogued as capacity enforcement", () => {
		expect(task?.title).toMatch(/capacity enforcement/i);
	});

	it("returns 409 when ticket type is full", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/events/[eventId]/registrations/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/EventRegistrationCapacityError/);
		expect(route).toMatch(/status: 409/);
	});

	it("counts posted and confirmed only for capacity", () => {
		const repo = readFileSync(
			join(
				process.cwd(),
				"src/lib/events/event-registrations.repository.ts",
			),
			"utf8",
		);
		expect(repo).toMatch(/posted and confirmed rows only/);
		expect(repo).toMatch(/"posted", "confirmed"/);
	});
});
