import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.4 volunteer_shift calendar events", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.4",
	);

	it("is catalogued as calendar volunteer shifts", () => {
		expect(task?.title).toMatch(/calendar volunteer_shift/i);
	});

	it("creates shifts with volunteer_shift type and capacity", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/volunteers/shifts/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/volunteer_shift/);
		expect(route).toMatch(/shiftCapacity/);
	});

	it("styles volunteer_shift on the calendar without removing contract types", () => {
		const config = readFileSync(
			join(process.cwd(), "src/components/calendar/eventTypeConfig.ts"),
			"utf8",
		);
		expect(config).toMatch(/volunteer_shift/);
		expect(config).toMatch(/contract/);
	});
});
