import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "../nonprofit-catalog";
import {
	linkedPrNumbersForSection,
	NPO_PR_BATCHES,
	npoBatchFromHeadRef,
	npoBatchOwnsTaskCode,
	npoCatalogDisplayTitleForPr,
	npoBatchBranchName,
	npoTaskCodesCompletedByPr,
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

	it("keeps product batch PRs at most 5 top-level tasks", () => {
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

	it("names batch branches under cursor/nonprofit/", () => {
		expect(npoBatchBranchName(NPO_PR_BATCHES[1]!)).toBe(
			"cursor/nonprofit/s01-b1-340a",
		);
	});

	it("completes batch task codes on the work PR, not the S1 B1 placeholder", () => {
		expect(npoTaskCodesCompletedByPr(113)).toEqual([
			"1.6",
			"1.7",
			"1.8",
			"1.9",
			"1.10",
		]);
		expect(npoTaskCodesCompletedByPr(109)).toEqual([]);
		expect(npoTaskCodesCompletedByPr(131)).toEqual([
			"1.1",
			"1.2",
			"1.3",
			"1.4",
			"1.5",
		]);
		const batch113 = NPO_PR_BATCHES.find((row) => row.linkedPrNumber === 113);
		expect(batch113 && npoBatchOwnsTaskCode(batch113, "1.7.a")).toBe(true);
		expect(batch113 && npoBatchOwnsTaskCode(batch113, "1.1")).toBe(false);
		expect(npoBatchFromHeadRef("cursor/nonprofit/s01-b2-340a")?.linkedPrNumber).toBe(
			113,
		);
	});

	it("labels a catalog PR with its section batch, not a bare number", () => {
		expect(npoCatalogDisplayTitleForPr(109)).toMatch(/S1 B1/);
		expect(npoCatalogDisplayTitleForPr(109)).toMatch(/1\.1–1\.5/);
		expect(npoCatalogDisplayTitleForPr(131)).toMatch(/S1 B1/);
		expect(npoCatalogDisplayTitleForPr(131)).toMatch(/1\.1–1\.5/);
		expect(npoCatalogDisplayTitleForPr(117)).toMatch(/1\.11/);
		expect(npoCatalogDisplayTitleForPr(86)).toMatch(/S0 B1/);
	});
});
