import { describe, expect, it } from "vitest";
import {
	buildCreateTemplateData,
	buildListTemplateQueries,
	parseClauseSlots,
} from "./contract-template.service";

describe("contract template recipes", () => {
	it("stores ordered clause family ids as JSON", () => {
		const data = buildCreateTemplateData(
			{
				name: "Vendor MSA",
				contractType: "vendor",
				status: "published",
				clauseSlots: [
					{ familyId: "fam_conf", required: true },
					{
						familyId: "fam_indem",
						required: false,
						condition: { field: "amountNumber", op: "gte", value: "50000" },
					},
				],
			},
			{ orgId: "org_a", userId: "user_1" },
		);

		expect(data).toMatchObject({
			orgId: "org_a",
			name: "Vendor MSA",
			contractType: "vendor",
			status: "published",
			createdBy: "user_1",
		});
		expect(parseClauseSlots(data.clauseSlots)).toHaveLength(2);
		expect(parseClauseSlots(data.clauseSlots)[1].condition?.op).toBe("gte");
	});

	it("rejects an empty recipe", () => {
		expect(() =>
			buildCreateTemplateData(
				{ name: "Blank", contractType: "vendor", clauseSlots: [] },
				{ orgId: "org_a", userId: "user_1" },
			),
		).toThrow(/at least one clause/i);
	});

	it("scopes every list query to the caller org", () => {
		const queries = buildListTemplateQueries({
			orgId: "org_a",
			status: "published",
		});
		expect(queries[0]).toContain("org_a");
		expect(queries.join(" ")).toContain("published");
		expect(queries.some((q) => q.includes("org_b"))).toBe(false);
	});
});
