import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { segmentBadgeClass } from "@/lib/fundraising/segment-display";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.4 segment badges and filter", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.4",
	);

	it("is catalogued as segment badges", () => {
		expect(task?.title).toMatch(/Segment badges/i);
	});

	it("uses CAALM chip colors for known segments", () => {
		expect(segmentBadgeClass("Champion")).toMatch(/bg-green\/10/);
		expect(segmentBadgeClass("At-risk")).toMatch(/bg-orange\/10/);
		expect(segmentBadgeClass("Lapsed")).toMatch(/bg-red\/10/);
	});

	it("does not crash on unknown segment labels", () => {
		expect(segmentBadgeClass("Not-a-real-segment")).toMatch(/slate/);
		const list = readFileSync(
			join(process.cwd(), "src/app/api/constituents/route.ts"),
			"utf8",
		);
		expect(list).toMatch(/segment/);
	});
});
