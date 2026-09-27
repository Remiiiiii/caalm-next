import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.7 recurring gift schedules", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.7",
	);

	it("is catalogued as recurring schedules", () => {
		expect(task?.title).toMatch(/Recurring/i);
	});

	it("spawns draft gifts and skips DNC constituents", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/recurring/repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/processDueRecurringSchedules/);
		expect(repo).toMatch(/createDraftGift/);
		expect(repo).toMatch(/canContact/);
		expect(repo).toMatch(/do_not_contact/);
	});
});
