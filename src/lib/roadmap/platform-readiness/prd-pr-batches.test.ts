import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "../platform-readiness-catalog";
import {
	linkedPrNumbersForPrdSection,
	PRD_PR_BATCHES,
	prdBatchBranchName,
	prdBatchFromHeadRef,
	prdBatchOwnsTaskCode,
} from "./prd-pr-batches";

describe("PRD PR batches", () => {
	it("groups product sections into batches of at most five tasks", () => {
		for (const batch of PRD_PR_BATCHES.filter((b) => b.sectionNumber > 0)) {
			expect(batch.taskCodes.length).toBeLessThanOrEqual(5);
		}
	});

	it("matches section linkedPrNumbers to the batch table", () => {
		for (const section of PLATFORM_READINESS_ROADMAP_CATALOG) {
			expect(section.linkedPrNumbers).toEqual(
				linkedPrNumbersForPrdSection(section.sectionNumber),
			);
		}
	});

	it("uses cursor/platform-readiness/sNN-bN-5329 branch names", () => {
		expect(prdBatchBranchName(PRD_PR_BATCHES[1]!)).toBe(
			"cursor/platform-readiness/s01-b1-5329",
		);
	});

	it("maps s02-b1 branch to section 2 batch 1", () => {
		const batch = prdBatchFromHeadRef("cursor/platform-readiness/s02-b1-5329");
		expect(batch?.sectionNumber).toBe(2);
		expect(prdBatchOwnsTaskCode(batch!, "2.3")).toBe(true);
	});
});
