import { describe, expect, it } from "vitest";
import { guessContractImportField } from "@/lib/contracts/import/fields";
import { applyContractColumnMapping } from "@/lib/contracts/import/parse";

describe("contract metadata import mapping", () => {
	it("guesses contract headers", () => {
		expect(guessContractImportField("contract_number")).toBe("contractNumber");
		expect(guessContractImportField("manager_emails")).toBe(
			"assignedManagerEmails",
		);
	});

	it("splits manager emails and rejects rows with no match key", () => {
		const { valid, errors } = applyContractColumnMapping(
			[
				{
					number: "C-1001",
					vendor: "Northwind",
					managers: "alex@example.org; pat@example.org",
				},
				{ number: "", vendor: "Nobody" },
			],
			{
				number: "contractNumber",
				vendor: "vendor",
				managers: "assignedManagerEmails",
			},
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.assignedManagerEmails).toEqual([
			"alex@example.org",
			"pat@example.org",
		]);
		expect(errors).toHaveLength(1);
	});
});
