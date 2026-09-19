import { describe, expect, it } from "vitest";
import { findDuplicateCatalogPrNumbers, ROADMAP_CATALOG } from "./catalog";
import { flattenCatalogTasks } from "./catalog-query";
import { NONPROFIT_ROADMAP_CATALOG } from "./nonprofit-catalog";

describe("nonprofit roadmap catalog", () => {
	it("keeps sections in dependency order", () => {
		expect(NONPROFIT_ROADMAP_CATALOG.map((s) => s.title)).toEqual([
			"Nonprofit Roadmap Engine",
			"Constituent CRM Foundation",
			"Gift and Campaign Ledger",
			"AI Fundraising Intelligence",
			"Restricted-Fund Finance",
			"Volunteer Programs",
			"Public Events and Check-in",
			"Stewardship Automation",
			"Impact and Board Reporting",
			"Imports, Payments, and Finance Export",
			"Consent, Privacy, and Packaging",
		]);
	});

	it("does not reuse a PR number inside the nonprofit catalog", () => {
		expect(findDuplicateCatalogPrNumbers()).toEqual([]);
		const npoNumbers: number[] = [];
		for (const section of NONPROFIT_ROADMAP_CATALOG) {
			npoNumbers.push(...(section.linkedPrNumbers ?? []));
		}
		expect(new Set(npoNumbers).size).toBe(npoNumbers.length);
	});

	it("does not reuse a CLM catalog PR number", () => {
		const clmNumbers = new Set(
			ROADMAP_CATALOG.flatMap((s) => s.linkedPrNumbers ?? []),
		);
		const npoLinked = NONPROFIT_ROADMAP_CATALOG.flatMap(
			(s) => s.linkedPrNumbers ?? [],
		);
		expect(npoLinked.filter((n) => clmNumbers.has(n))).toEqual([]);
	});

	it("does not treat the nonprofit project as one linked PR", () => {
		expect(NONPROFIT_ROADMAP_CATALOG[0]?.linkedPrNumbers ?? []).toEqual([]);
		expect(NONPROFIT_ROADMAP_CATALOG[0]?.seedComplete).toBe(true);
		for (const section of NONPROFIT_ROADMAP_CATALOG) {
			expect(section.linkedPrNumbers ?? []).toEqual([]);
		}
	});

	it("uses sequential per-task PRs on product sections, not one mono-PR", () => {
		const product = NONPROFIT_ROADMAP_CATALOG.filter(
			(section) => section.sectionNumber > 0,
		);
		expect(product.length).toBe(10);
		for (const section of product) {
			expect(section.sequentialTasks).toBe(true);
			expect(section.perTaskPrCompletion).toBe(true);
			expect(section.linkedPrNumbers ?? []).toEqual([]);
			expect(section.tasks.length).toBeGreaterThanOrEqual(8);
		}
		expect(NONPROFIT_ROADMAP_CATALOG[0]?.sequentialTasks).toBe(true);
		const nested = flattenCatalogTasks(NONPROFIT_ROADMAP_CATALOG).filter(
			(task) => task.taskCode.split(".").length > 2,
		);
		expect(nested.length).toBeGreaterThan(8);
	});

	it("keeps unique task codes inside the nonprofit catalog", () => {
		const codes = flattenCatalogTasks(NONPROFIT_ROADMAP_CATALOG).map(
			(task) => task.taskCode,
		);
		expect(new Set(codes).size).toBe(codes.length);
	});

	it("points NPO tests at tests/roadmap/npo/ so they do not collide with CLM suites", () => {
		const tasks = flattenCatalogTasks(NONPROFIT_ROADMAP_CATALOG);
		expect(tasks.length).toBeGreaterThan(80);
		for (const task of tasks) {
			expect(task.testSuiteRef).toMatch(/^tests\/roadmap\/npo\//);
		}
	});

	it("covers the four nonprofit SaaS gaps CAALM does not already ship", () => {
		const titles = NONPROFIT_ROADMAP_CATALOG.map((s) => s.title).join(" ");
		expect(titles).toMatch(/Constituent/);
		expect(titles).toMatch(/Gift/);
		expect(titles).toMatch(/AI Fundraising/);
		expect(titles).toMatch(/Restricted-Fund/);
		expect(titles).toMatch(/Volunteer/);
		expect(titles).toMatch(/Events/);
	});

	it("tells later PRs to use the cursor Who/What/Where/Why/When/How body", () => {
		const engine = NONPROFIT_ROADMAP_CATALOG[0]?.tasks[0]?.description ?? "";
		expect(engine).toMatch(/Who/);
		expect(engine).toMatch(/What/);
		expect(engine).toMatch(/Where/);
		expect(engine).toMatch(/Why/);
		expect(engine).toMatch(/npo\//);
	});
});
