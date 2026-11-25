import { describe, expect, it } from "vitest";
import { linkedPrNumbersInCatalog } from "../catalog-query";
import { catalogForKey } from "../catalogs";
import {
	addDynamicTodoSection,
	getDynamicTodoSections,
} from "./dynamic-sections";
import { TODO_ROADMAP_CATALOG } from "./todo-catalog";
import { buildTodoSectionPrBody, todoPullRequestTitle } from "./todo-pr-body";

describe("TODO_ROADMAP_CATALOG stub PR links", () => {
	it("every section's stub PR shows up where the board reads PR links", () => {
		for (const section of TODO_ROADMAP_CATALOG) {
			const numbers = linkedPrNumbersInCatalog(
				TODO_ROADMAP_CATALOG,
				section.sectionNumber,
			);
			expect(numbers.length).toBe(1);
			expect(numbers[0]).toBe(section.tasks[0]!.linkedPrNumber);
		}
	});
});

describe("TODO_ROADMAP_CATALOG", () => {
	it("has one task per section with a unique sectionNumber and taskCode", () => {
		const seenSections = new Set<number>();
		const seenCodes = new Set<string>();
		for (const section of TODO_ROADMAP_CATALOG) {
			expect(seenSections.has(section.sectionNumber)).toBe(false);
			seenSections.add(section.sectionNumber);
			expect(section.tasks).toHaveLength(1);
			const code = section.tasks[0]!.taskCode;
			expect(seenCodes.has(code)).toBe(false);
			seenCodes.add(code);
			expect(section.tasks[0]!.acceptanceCriteria.length).toBeGreaterThan(0);
		}
	});
});

describe("buildTodoSectionPrBody", () => {
	it("renders Who/What/Where/Why/When/How and Done when from the catalog task", () => {
		const section = TODO_ROADMAP_CATALOG[0]!;
		const body = buildTodoSectionPrBody(section);
		expect(body).toContain("**Who:**");
		expect(body).toContain("**What:**");
		expect(body).toContain("## Done when");
		expect(todoPullRequestTitle(section)).toContain("TODO 1.1");
	});
});

describe('catalogForKey("todo")', () => {
	it("appends sections added at runtime after the static catalog", () => {
		const before = catalogForKey("todo").length;
		addDynamicTodoSection({
			sectionNumber: 9999,
			title: "Test dynamic section",
			sourceRef: "test",
			tasks: [
				{
					taskCode: "9999.1",
					title: "Test task",
					description:
						"Who: tester. What: verify merge. Where: test. Why: test. When: test. How: test.",
					acceptanceCriteria: ["It shows up"],
					testSuiteRef: "tests/roadmap/todo/9999-1.test.ts",
				},
			],
		});
		expect(catalogForKey("todo").length).toBe(before + 1);
		expect(getDynamicTodoSections().at(-1)?.sectionNumber).toBe(9999);
	});
});
