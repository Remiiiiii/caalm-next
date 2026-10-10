import { describe, expect, it } from "vitest";
import { guessObligationImportField } from "@/lib/funding/import/fields";
import { applyObligationColumnMapping } from "@/lib/funding/import/parse";

describe("obligation import mapping", () => {
	it("guesses obligation headers", () => {
		expect(guessObligationImportField("contract_number")).toBe("contractNumber");
		expect(guessObligationImportField("due_date")).toBe("dueDate");
	});

	it("requires a title and a contract match key", () => {
		const { valid, errors } = applyObligationColumnMapping(
			[
				{
					contract_number: "GRANT-1",
					title: "Quarterly report",
					kind: "reporting",
				},
				{ contract_number: "", title: "Missing contract" },
			],
			{
				contract_number: "contractNumber",
				title: "title",
				kind: "kind",
			},
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.kind).toBe("reporting");
		expect(errors).toHaveLength(1);
	});
});
