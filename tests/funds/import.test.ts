import { describe, expect, it } from "vitest";
import { guessFundImportField } from "@/lib/funds/import/fields";
import {
	applyFundColumnMapping,
	parseNetAssetClassFromImport,
} from "@/lib/funds/import/parse";

describe("fund CSV import parse", () => {
	it("guesses common finance headers", () => {
		expect(guessFundImportField("fund_code")).toBe("code");
		expect(guessFundImportField("Fund Name")).toBe("name");
		expect(guessFundImportField("restriction_type")).toBe("netAssetClass");
	});

	it("normalizes net asset class labels", () => {
		expect(parseNetAssetClassFromImport("Unrestricted")).toBe("unrestricted");
		expect(parseNetAssetClassFromImport("Temporarily Restricted")).toBe(
			"temporarily_restricted",
		);
		expect(parseNetAssetClassFromImport("permanent endowment")).toBe(
			"permanently_restricted",
		);
	});

	it("maps rows and rejects incomplete lines", () => {
		const { valid, errors } = applyFundColumnMapping(
			[
				{
					fund_code: "A1",
					fund_name: "Operating",
					class: "general",
				},
				{ fund_code: "", fund_name: "Bad", class: "unrestricted" },
			],
			{
				fund_code: "code",
				fund_name: "name",
				class: "netAssetClass",
			},
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.code).toBe("A1");
		expect(valid[0]?.netAssetClass).toBe("unrestricted");
		expect(errors).toHaveLength(1);
	});
});
