import { describe, expect, it } from "vitest";
import {
	extractFarClausesFromStructure,
	filterFarClauses,
	formatFarClauseLine,
	isSelectableFarClause,
	parseFarClauseNumbers,
	serializeFarClauseSelection,
} from "./far-clauses";

describe("far-clauses", () => {
	it("keeps real Part 52 clauses and drops scope / reserved rows", () => {
		expect(
			isSelectableFarClause({
				identifier: "52.212-4",
				label_description:
					"Contract Terms and Conditions—Commercial Products and Commercial Services.",
			}),
		).toBe(true);
		expect(
			isSelectableFarClause({
				identifier: "52.000",
				label_description: "Scope of part.",
			}),
		).toBe(false);
		expect(
			isSelectableFarClause({
				identifier: "52.106",
				label_description: "52.106 [Reserved]",
			}),
		).toBe(false);
	});

	it("extracts a sorted unique clause list from eCFR structure", () => {
		const clauses = extractFarClausesFromStructure({
			type: "part",
			identifier: "52",
			children: [
				{
					type: "section",
					identifier: "52.000",
					label_description: "Scope of part.",
				},
				{
					type: "subpart",
					identifier: "52.2",
					children: [
						{
							type: "section",
							identifier: "52.212-4",
							label_description:
								"Contract Terms and Conditions—Commercial Products.",
						},
						{
							type: "section",
							identifier: "52.203-3",
							label_description: "Gratuities.",
						},
					],
				},
			],
		});
		expect(clauses.map((c) => c.number)).toEqual(["52.203-3", "52.212-4"]);
		expect(clauses[0].title).toBe("Gratuities");
	});

	it("round-trips selected clause numbers into document lines", () => {
		const catalog = [
			{ number: "52.203-3", title: "Gratuities" },
			{ number: "52.212-4", title: "Commercial Terms" },
		];
		const text = serializeFarClauseSelection(
			["52.212-4", "52.203-3", "52.212-4"],
			catalog,
		);
		expect(text).toBe(
			["FAR 52.212-4 — Commercial Terms", "FAR 52.203-3 — Gratuities"].join(
				"\n",
			),
		);
		expect(parseFarClauseNumbers(text)).toEqual(["52.212-4", "52.203-3"]);
		expect(formatFarClauseLine(catalog[0])).toBe("FAR 52.203-3 — Gratuities");
	});

	it("filters by clause number or title", () => {
		const clauses = [
			{ number: "52.203-3", title: "Gratuities" },
			{ number: "52.212-4", title: "Commercial Terms" },
		];
		expect(filterFarClauses(clauses, "212").map((c) => c.number)).toEqual([
			"52.212-4",
		]);
		expect(filterFarClauses(clauses, "grat").map((c) => c.number)).toEqual([
			"52.203-3",
		]);
	});
});
