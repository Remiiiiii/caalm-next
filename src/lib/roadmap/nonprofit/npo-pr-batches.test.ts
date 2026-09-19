import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "../nonprofit-catalog";
import {
	linkedPrNumbersForSection,
	NPO_PR_BATCHES,
	productNpoPrBatches,
} from "./npo-pr-batches";
import { NONPROFIT_SECTION_CATALOGS } from "./section-catalogs";

describe("nonprofit section catalogs", () => {
	it("exports one catalog per section 0–10", () => {
		expect(
			Object.keys(NONPROFIT_SECTION_CATALOGS)
				.map(Number)
				.sort((a, b) => a - b),
		).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		for (const section of NONPROFIT_ROADMAP_CATALOG) {
			expect(NONPROFIT_SECTION_CATALOGS[section.sectionNumber]?.title).toBe(
				section.title,
			);
		}
	});

	it("keeps product stub batches at most 5 top-level tasks", () => {
		for (const batch of productNpoPrBatches()) {
			expect(batch.taskCodes.length).toBeGreaterThan(0);
			expect(batch.taskCodes.length).toBeLessThanOrEqual(5);
			expect(batch.linkedPrNumber).toBeGreaterThan(86);
		}
	});

	it("does not reuse a catalog PR number across batches", () => {
		const numbers = NPO_PR_BATCHES.map((batch) => batch.linkedPrNumber);
		expect(numbers.every((n) => n != null)).toBe(true);
		expect(new Set(numbers).size).toBe(numbers.length);
	});

	it("matches section linkedPrNumbers to the batch table", () => {
		for (const section of NONPROFIT_ROADMAP_CATALOG) {
			expect(section.linkedPrNumbers).toEqual(
				linkedPrNumbersForSection(section.sectionNumber),
			);
		}
	});
});
