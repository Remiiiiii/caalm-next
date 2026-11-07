import { describe, expect, it } from "vitest";
import { findCatalogTask } from "../catalog-query";
import { PRODUCTION_TOOLS_ROADMAP_CATALOG } from "../production-tools-catalog";
import {
	linkedPrNumbersForPtoSection,
	PTO_PR_BATCHES,
	ptoBatchBranchName,
	ptoBatchFromHeadRef,
	ptoBatchOwnsTaskCode,
} from "./pto-pr-batches";

describe("PTO PR batches", () => {
	it("groups product sections into batches of at most five tasks", () => {
		for (const batch of PTO_PR_BATCHES.filter((b) => b.sectionNumber > 0)) {
			expect(batch.taskCodes.length).toBeLessThanOrEqual(5);
		}
	});

	it("matches section linkedPrNumbers to the batch table", () => {
		for (const section of PRODUCTION_TOOLS_ROADMAP_CATALOG) {
			expect(section.linkedPrNumbers).toEqual(
				linkedPrNumbersForPtoSection(section.sectionNumber),
			);
		}
	});

	it("uses cursor/production-tools/sNN-bN-5329 branch names", () => {
		expect(ptoBatchBranchName(PTO_PR_BATCHES[1]!)).toBe(
			"cursor/production-tools/s01-b1-5329",
		);
	});

	it("maps s02-b1 branch to section 2 batch 1", () => {
		const batch = ptoBatchFromHeadRef("cursor/production-tools/s02-b1-5329");
		expect(batch?.sectionNumber).toBe(2);
		expect(ptoBatchOwnsTaskCode(batch!, "2.3")).toBe(true);
	});

	it("every batch task code exists in the catalog", () => {
		for (const batch of PTO_PR_BATCHES) {
			for (const code of batch.taskCodes) {
				const found = PRODUCTION_TOOLS_ROADMAP_CATALOG.some((section) =>
					Boolean(findCatalogTask(section.tasks, code)),
				);
				expect(found, `missing catalog task ${code}`).toBe(true);
			}
		}
	});
});
