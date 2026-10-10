import { describe, expect, it } from "vitest";
import { guessLicenseImportField } from "@/lib/licenses/import/fields";
import { applyLicenseColumnMapping } from "@/lib/licenses/import/parse";

describe("license import mapping", () => {
	it("guesses license headers", () => {
		expect(guessLicenseImportField("license_name")).toBe("licenseName");
		expect(guessLicenseImportField("expiry")).toBe("licenseExpiryDate");
	});

	it("maps rows through licenseCreateSchema", () => {
		const { valid, errors } = applyLicenseColumnMapping(
			[
				{
					name: "Microsoft 365",
					department: "IT",
					division: "Operations",
				},
				{ name: "", department: "IT", division: "Operations" },
			],
			{
				name: "licenseName",
				department: "department",
				division: "division",
			},
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.payload.licenseName).toBe("Microsoft 365");
		expect(errors).toHaveLength(1);
	});
});
