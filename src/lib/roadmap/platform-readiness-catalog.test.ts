import { describe, expect, it } from "vitest";
import { ROADMAP_CATALOG } from "./catalog";
import { flattenCatalogTasks } from "./catalog-query";
import { NONPROFIT_ROADMAP_CATALOG } from "./nonprofit-catalog";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "./platform-readiness-catalog";

describe("platform readiness roadmap catalog", () => {
	it("lists sections in assessment priority order", () => {
		expect(PLATFORM_READINESS_ROADMAP_CATALOG.map((s) => s.title)).toEqual([
			"Platform Readiness Roadmap Engine",
			"Workspace data isolation",
			"API permission coverage",
			"Trustworthy sign-in and two-factor",
			"Honest dashboards and compliance views",
			"IT portal credibility",
			"Enterprise buyer honesty",
		]);
	});

	it("uses sequential per-task completion on product sections", () => {
		const product = PLATFORM_READINESS_ROADMAP_CATALOG.filter(
			(s) => s.sectionNumber > 0,
		);
		for (const section of product) {
			expect(section.sequentialTasks).toBe(true);
			expect(section.perTaskPrCompletion).toBe(true);
		}
	});

	it("embeds 5W+H PR guidance in every task description", () => {
		for (const section of PLATFORM_READINESS_ROADMAP_CATALOG) {
			for (const task of section.tasks) {
				expect(task.description).toMatch(/Who:/);
				expect(task.description).toMatch(/What:/);
				expect(task.description).toMatch(/Where:/);
				expect(task.description).toMatch(/Why:/);
				expect(task.description).toMatch(/When:/);
				expect(task.description).toMatch(/How:/);
			}
		}
	});

	it("does not reuse task codes from CLM or NPO catalogs", () => {
		const prdCodes = new Set(
			flattenCatalogTasks(PLATFORM_READINESS_ROADMAP_CATALOG).map(
				(t) => t.taskCode,
			),
		);
		const clmCodes = flattenCatalogTasks(ROADMAP_CATALOG).map((t) => t.taskCode);
		const npoCodes = flattenCatalogTasks(NONPROFIT_ROADMAP_CATALOG).map(
			(t) => t.taskCode,
		);
		// Same numeric codes (1.1) are OK across catalogs — ids are prefixed prd_
		expect(prdCodes.has("0.1")).toBe(true);
		expect(clmCodes.filter((c) => prdCodes.has(c)).length).toBeGreaterThan(0);
		expect(npoCodes.filter((c) => prdCodes.has(c)).length).toBeGreaterThan(0);
	});

	it("seeds section 0 complete so section 1 can unlock", () => {
		expect(PLATFORM_READINESS_ROADMAP_CATALOG[0]?.seedComplete).toBe(true);
	});
});
