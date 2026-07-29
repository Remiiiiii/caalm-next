import { describe, expect, it } from "vitest";
import {
	buildFormPatchFromLicenseExtraction,
	isRealLicenseExtractionMethod,
	LICENSE_EXTRACTION_METHOD,
	mergeLicenseExtractions,
	parseLicenseExtractionJson,
	parseLicenseKeyValueText,
	scrubNaValue,
} from "@/lib/ai/licenseExtractionSchema";
import {
	normalizeAmountString,
	normalizeDateString,
} from "@/lib/ai/contractExtractionSchema";

/** Golden expected values from document/Nonprofit_Residential_License_v2.pdf */
const GOLDEN_RESIDENTIAL_LICENSE = {
	licenseName:
		"Residential Child-Caring Agency License — Parkline Youth Stabilization Program",
	licenseNumber: "RCC-2026-05589",
	licenseType: "Facility Operating License",
	category: "Certificate",
	issuingAuthority:
		"FL Dept. of Children and Families, Office of Child Welfare",
	division: "Child Welfare",
	issueDate: "August 1, 2026",
	licenseExpiryDate: "July 31, 2027",
	renewalDate: "May 15, 2027",
	status: "Active",
	compliance: "Compliant",
	autoRenew: false,
	renewalNoticeDays: "60",
	vendor: "N/A (Regulatory License)",
	product: "N/A",
	cost: "$650.00",
	currencyCode: "USD",
	quantity: "1",
	description:
		'Authorizes the operation of a licensed residential child-caring facility (the "Parkline Youth Stabilization Program") providing short-term residential placement.',
	subDepartment: "Residential Stabilization Unit",
	businessUnit: "Community-Based Care — South Region",
	notes:
		"Facility passed FY2026 annual re-inspection with no deficiencies noted.",
	overallConfidence: 0.94,
	fieldConfidence: {
		licenseNumber: 0.99,
		cost: 0.99,
		licenseExpiryDate: 0.98,
		issuingAuthority: 0.97,
		licenseName: 0.95,
	},
};

const SAMPLE_PDF_KV_SNIPPET = `
licenseName:
Residential Child-Caring Agency License —
Parkline Youth Stabilization Program
licenseNumber:
RCC-2026-05589
licenseType:
Facility Operating License
category:
Certificate
issuingAuthority:
FL Dept. of Children and Families, Office of
Child Welfare
division:
Child Welfare
issueDate:
August 1, 2026
licenseExpiryDate:
July 31, 2027
renewalDate:
May 15, 2027
status:
Active
compliance:
Compliant
autoRenew:
false
renewalNoticeDays:
60
vendor:
N/A (Regulatory License)
product:
N/A
cost:
$650.00
currencyCode:
USD
quantity:
1
`;

describe("license normalize helpers", () => {
	it("normalizes cost amounts from PDF", () => {
		expect(normalizeAmountString("$650.00")).toBe("650");
		expect(normalizeAmountString("650.00")).toBe("650");
	});

	it("normalizes license dates", () => {
		expect(normalizeDateString("August 1, 2026")).toBe("2026-08-01");
		expect(normalizeDateString("July 31, 2027")).toBe("2027-07-31");
		expect(normalizeDateString("2027-05-15")).toBe("2027-05-15");
	});

	it("scrubs N/A vendor/product", () => {
		expect(scrubNaValue("N/A")).toBeUndefined();
		expect(scrubNaValue("N/A (Regulatory License)")).toBeUndefined();
		expect(scrubNaValue("Acme Corp")).toBe("Acme Corp");
	});
});

describe("isRealLicenseExtractionMethod", () => {
	it("accepts gemini method only", () => {
		expect(
			isRealLicenseExtractionMethod(LICENSE_EXTRACTION_METHOD.gemini),
		).toBe(true);
		expect(isRealLicenseExtractionMethod(LICENSE_EXTRACTION_METHOD.test)).toBe(
			false,
		);
		expect(isRealLicenseExtractionMethod(undefined)).toBe(false);
	});
});

describe("parseLicenseKeyValueText", () => {
	it("extracts labeled fields including cost 650 from PDF-shaped text", () => {
		const kv = parseLicenseKeyValueText(SAMPLE_PDF_KV_SNIPPET);
		expect(kv.licenseNumber).toBe("RCC-2026-05589");
		expect(kv.cost).toBe("$650.00");
		expect(kv.category).toBe("Certificate");
		expect(kv.autoRenew).toBe(false);
		expect(String(kv.licenseName)).toContain("Parkline");
	});
});

describe("golden residential license extraction parse", () => {
	it("maps PDF ground-truth fields onto form values with cost 650", () => {
		const parsed = parseLicenseExtractionJson(
			JSON.stringify(GOLDEN_RESIDENTIAL_LICENSE),
		);

		expect(parsed.fields.licenseNumber).toBe("RCC-2026-05589");
		expect(parsed.fields.licenseName).toContain("Parkline");
		expect(parsed.fields.cost).toBe("650");
		expect(parsed.fields.licenseType).toBe("facility_operating");
		expect(parsed.fields.category).toBe("certificate");
		expect(parsed.fields.status).toBe("active");
		expect(parsed.fields.compliance).toBe("compliant");
		expect(parsed.fields.division).toBe("childwelfare");
		expect(parsed.fields.issueDate).toBe("2026-08-01");
		expect(parsed.fields.licenseExpiryDate).toBe("2027-07-31");
		expect(parsed.fields.renewalDate).toBe("2027-05-15");
		expect(parsed.fields.renewalNoticeDays).toBe("60");
		expect(parsed.fields.autoRenew).toBe(false);
		expect(parsed.fields.issuingAuthority).toContain("Children and Families");
		expect(parsed.fields.vendor).toBeUndefined();
		expect(parsed.fields.product).toBeUndefined();
		expect(parsed.overallConfidence).toBe(0.94);
		expect(parsed.filledFieldNames.length).toBeGreaterThan(10);
		expect(parsed.fieldConfidence.cost).toBeGreaterThan(0.9);
	});

	it("builds a form patch with Date objects and normalized cost", () => {
		const parsed = parseLicenseExtractionJson(
			JSON.stringify(GOLDEN_RESIDENTIAL_LICENSE),
		);
		const patch = buildFormPatchFromLicenseExtraction(parsed);
		expect(patch.licenseNumber).toBe("RCC-2026-05589");
		expect(patch.cost).toBe("650");
		expect(patch.licenseExpiryDate).toBeInstanceOf(Date);
		expect((patch.licenseExpiryDate as Date).getFullYear()).toBe(2027);
		expect((patch.licenseExpiryDate as Date).getMonth()).toBe(6); // July
		expect((patch.licenseExpiryDate as Date).getDate()).toBe(31);
		expect(patch.issueDate).toBeInstanceOf(Date);
		expect(patch.issuingAuthority).toContain("Child Welfare");
	});

	it("merges key-value pre-parse over empty gemini for cost", () => {
		const kv = parseLicenseKeyValueText(SAMPLE_PDF_KV_SNIPPET);
		const empty = parseLicenseExtractionJson("{}");
		const merged = mergeLicenseExtractions(kv, empty);
		expect(merged.fields.cost).toBe("650");
		expect(merged.fields.licenseNumber).toBe("RCC-2026-05589");
		expect(merged.fields.category).toBe("certificate");
	});
});
