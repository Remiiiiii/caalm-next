import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.8 Release rows on journal export", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.8",
	);

	it("is catalogued as release rows on journal export", () => {
		expect(task?.title).toMatch(/Release rows on the journal export/i);
	});

	it("emits signed reclass pair rows per restriction release", () => {
		const collect = readFileSync(
			join(process.cwd(), "src/lib/funding/journal-export/collect.ts"),
			"utf8",
		);
		expect(collect).toMatch(/listRestrictionReleasesInRange/);
		expect(collect).toMatch(/reclassLeg/);
		expect(collect).toMatch(/amount: -release\.amount/);
		expect(collect).toMatch(/amount: release\.amount/);
		expect(collect).toMatch(/giftCashTotal/);
	});
});
