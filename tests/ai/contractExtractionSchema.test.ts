import { describe, expect, it } from "vitest";
import {
	buildFormPatchFromExtraction,
	CONTRACT_EXTRACTION_METHOD,
	isRealExtractionMethod,
	normalizeAmountString,
	normalizeDateString,
	parseContractExtractionJson,
} from "@/lib/ai/contractExtractionSchema";

/** Golden expected values from document/Government_Nonprofit_Grant_Agreement.pdf */
const GOLDEN_GRANT_EXTRACTION = {
	contractName:
		"Community-Based Behavioral Health & Child Welfare Support Services",
	contractNumber: "CFS-2026-00147",
	description:
		"Expansion of the Parkline Community Resilience Program, providing licensed clinician-led behavioral health assessments, crisis diversion, and wraparound case management services to at-risk youth and families, targeting 350 unduplicated households annually.",
	assignToDepartment: "Executive (Contracts Office)",
	lifecycleStatus: "Under Review",
	startDate: "2026-10-01",
	executionDate: "2026-07-28",
	expiryDate: "2027-09-30",
	autoRenew: false,
	renewalNoticeDays: "60",
	amount: "487500.00",
	currencyCode: "USD",
	notToExceedAmount: "487500.00",
	paymentTerms: "Net 30",
	paymentSchedule: "Quarterly",
	budgetCode: "DCF-BH-2026-0147",
	costCenter: "CW-4402",
	riskLevel: "High Risk",
	vendor: "Miami Community Wellness Alliance, Inc.",
	counterpartyType: "Nonprofit Corporation (501(c)(3))",
	counterpartyContactName: "Maria Fuentes, Executive Director",
	counterpartyContactEmail: "mfuentes@miamicwa.org",
	counterpartyContactPhone: "(305) 555-0142",
	counterpartyAddress: "1200 NW 20th Street, Miami, FL 33136",
	hipaaRequired: true,
	backgroundCheckRequired: true,
	auditRightsGranted: true,
	insuranceRequired: true,
	governingLaw: "State of Florida",
	overallConfidence: 0.92,
	fieldConfidence: {
		contractNumber: 0.99,
		amount: 0.98,
		expiryDate: 0.97,
		vendor: 0.96,
		contractName: 0.95,
	},
};

describe("normalize helpers", () => {
	it("normalizes amounts", () => {
		expect(normalizeAmountString("$487,500.00")).toBe("487500");
		expect(normalizeAmountString("487500.00")).toBe("487500");
	});

	it("normalizes dates", () => {
		expect(normalizeDateString("September 30, 2027")).toBe("2027-09-30");
		expect(normalizeDateString("2027-09-30")).toBe("2027-09-30");
		expect(normalizeDateString("10/01/2026")).toBe("2026-10-01");
	});
});

describe("isRealExtractionMethod", () => {
	it("accepts gemini method only", () => {
		expect(isRealExtractionMethod(CONTRACT_EXTRACTION_METHOD.gemini)).toBe(
			true,
		);
		expect(isRealExtractionMethod(CONTRACT_EXTRACTION_METHOD.test)).toBe(false);
		expect(isRealExtractionMethod(undefined)).toBe(false);
	});
});

describe("golden grant agreement extraction parse", () => {
	it("maps vendor alias and PDF ground-truth fields onto form values", () => {
		const parsed = parseContractExtractionJson(
			JSON.stringify(GOLDEN_GRANT_EXTRACTION),
		);

		expect(parsed.fields.contractNumber).toBe("CFS-2026-00147");
		expect(parsed.fields.contractName).toContain("Behavioral Health");
		expect(parsed.fields.counterpartyLegalName).toBe(
			"Miami Community Wellness Alliance, Inc.",
		);
		expect(parsed.fields.amount).toBe("487500");
		expect(parsed.fields.notToExceedAmount).toBe("487500");
		expect(parsed.fields.expiryDate).toBe("2027-09-30");
		expect(parsed.fields.startDate).toBe("2026-10-01");
		expect(parsed.fields.lifecycleStatus).toBe("under_review");
		expect(parsed.fields.riskLevel).toBe("high");
		expect(parsed.fields.paymentTerms).toBe("net_30");
		expect(parsed.fields.paymentSchedule).toBe("quarterly");
		expect(parsed.fields.budgetCode).toBe("DCF-BH-2026-0147");
		expect(parsed.fields.costCenter).toBe("CW-4402");
		expect(parsed.fields.assignToDepartment).toBe("Executive");
		expect(parsed.fields.counterpartyType).toBe("nonprofit");
		expect(parsed.fields.counterpartyContactEmail).toBe(
			"mfuentes@miamicwa.org",
		);
		expect(parsed.fields.hipaaRequired).toBe(true);
		expect(parsed.fields.backgroundCheckRequired).toBe(true);
		expect(parsed.fields.auditRightsGranted).toBe(true);
		expect(parsed.overallConfidence).toBe(0.92);
		expect(parsed.filledFieldNames.length).toBeGreaterThan(15);
		expect(parsed.fieldConfidence.counterpartyLegalName).toBeGreaterThan(0.9);
	});

	it("builds a form patch with Date objects for timeline fields", () => {
		const parsed = parseContractExtractionJson(
			JSON.stringify(GOLDEN_GRANT_EXTRACTION),
		);
		const patch = buildFormPatchFromExtraction(parsed);
		expect(patch.contractNumber).toBe("CFS-2026-00147");
		expect(patch.expiryDate).toBeInstanceOf(Date);
		expect((patch.expiryDate as Date).getFullYear()).toBe(2027);
		expect((patch.expiryDate as Date).getMonth()).toBe(8); // September
		expect((patch.expiryDate as Date).getDate()).toBe(30);
		expect(patch.amount).toBe("487500");
		expect(patch.counterpartyLegalName).toContain("Miami Community");
	});
});
