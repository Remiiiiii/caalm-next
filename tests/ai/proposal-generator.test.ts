import { describe, expect, it } from "vitest";
import {
	fallbackOutline,
	fallbackShred,
	parseOutlineSections,
	parseShreddedRequirements,
} from "@/lib/ai/proposal-generator";

describe("parseShreddedRequirements", () => {
	it("keeps valid rows and drops empty text", () => {
		const rows = parseShreddedRequirements([
			{
				requirementText: "The contractor shall submit monthly reports.",
				sourceSection: "C",
				sourcePage: 12,
				responseType: "compliant",
			},
			{ requirementText: "   " },
			{ notARow: true },
			{
				requirementText: "Offerors must stay under 15 pages.",
				sourceSection: "nope",
				sourcePage: "x",
				responseType: "maybe",
			},
		]);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			requirementText: "The contractor shall submit monthly reports.",
			sourceSection: "C",
			sourcePage: 12,
			responseType: "compliant",
		});
		expect(rows[1].sourceSection).toBe("other");
		expect(rows[1].responseType).toBe("clarification");
		expect(rows[1].sourcePage).toBeUndefined();
	});

	it("returns empty for non-arrays", () => {
		expect(parseShreddedRequirements(null)).toEqual([]);
		expect(parseShreddedRequirements({ requirements: [] })).toEqual([]);
	});
});

describe("parseOutlineSections", () => {
	it("parses headings and integer indexes", () => {
		const sections = parseOutlineSections([
			{ heading: "Technical approach", requirementIndexes: [0, "1", -1, 2.5] },
			{ heading: "  " },
			{ heading: "Past performance", requirementIndexes: "nope" },
		]);
		expect(sections).toEqual([
			{ heading: "Technical approach", requirementIndexes: [0, 1] },
			{ heading: "Past performance", requirementIndexes: [] },
		]);
	});
});

describe("fallbackShred", () => {
	it("picks shall/must/will lines and maps Section L/M/C", () => {
		const rows = fallbackShred(
			[
				"Intro fluff",
				"Section L: Offerors shall include a 10-page technical volume.",
				"The contractor must provide a program manager.",
				"Section M: The Government will evaluate past performance.",
			].join("\n"),
		);
		expect(rows).toHaveLength(3);
		expect(rows[0].sourceSection).toBe("L");
		expect(rows[1].sourceSection).toBe("other");
		expect(rows[2].sourceSection).toBe("M");
		expect(rows.every((row) => row.responseType === "clarification")).toBe(
			true,
		);
	});
});

describe("fallbackOutline", () => {
	it("returns a technical heading when there are no requirements", () => {
		expect(fallbackOutline([])).toEqual([
			{ heading: "Technical approach", requirementIndexes: [] },
		]);
	});

	it("groups the first eight rows into understanding", () => {
		const requirements = Array.from({ length: 10 }, (_, index) => ({
			requirementText: `shall ${index}`,
		}));
		const sections = fallbackOutline(requirements);
		expect(sections[0].heading).toBe("Understanding of the requirement");
		expect(sections[0].requirementIndexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
		expect(sections[1].requirementIndexes).toEqual([8, 9]);
	});
});
