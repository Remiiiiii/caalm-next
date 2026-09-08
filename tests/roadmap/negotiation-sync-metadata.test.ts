import { describe, expect, it } from "vitest";
import {
	buildNegotiatedContractPatch,
	isBlankMetaValue,
	mergeNegotiatedFacts,
	parseValueField,
	refreshSnapshotMetadata,
	toContractDatetime,
	withRefreshedMetadataBlock,
} from "@/lib/contracts/negotiation/sync-metadata.logic";

const SNAPSHOT = `<!-- negotiation-snapshot:docx -->

# FY2026 Community Grant Agreement

- Other party: Community Care Nonprofit
- Department: Finance
- Value: USD 500000
- Effective date: 2026-09-07
- Expiry date: 2026-12-31
- Governing law: Delaware
- Assembled: 2026-09-07

## 1. GRANT PURPOSE

Effective Date: 2026-09-10

Expiry Date: 2027-01-15

Grant Amount: USD 600000
`;

describe("sync-metadata.logic", () => {
	it("treats em dash and placeholders as blank", () => {
		expect(isBlankMetaValue("—")).toBe(true);
		expect(isBlankMetaValue("  ")).toBe(true);
		expect(isBlankMetaValue("n/a")).toBe(true);
		expect(isBlankMetaValue("2026-09-07")).toBe(false);
	});

	it("parses Value into amount and currency", () => {
		expect(parseValueField("USD 500000")).toEqual({
			amount: 500000,
			currencyCode: "USD",
		});
		expect(parseValueField("—")).toEqual({});
	});

	it("prefers body facts over MetaCard when both exist", () => {
		const merged = mergeNegotiatedFacts(
			{ expiryDate: "2026-12-31", effectiveDate: "2026-09-07" },
			{ expiryDate: "2027-01-15", effectiveDate: "2026-09-10" },
		);
		expect(merged.expiryDate).toBe("2027-01-15");
		expect(merged.effectiveDate).toBe("2026-09-10");
	});

	it("fills from MetaCard when body has no fact", () => {
		const merged = mergeNegotiatedFacts(
			{ otherParty: "Acme", department: "Legal" },
			{},
		);
		expect(merged.otherParty).toBe("Acme");
		expect(merged.department).toBe("Legal");
	});

	it("builds a Contracts patch from snapshot + body (body wins on dates/amount)", () => {
		const patch = buildNegotiatedContractPatch(SNAPSHOT);
		expect(patch.contractName).toBe("FY2026 Community Grant Agreement");
		expect(patch.vendor).toBe("Community Care Nonprofit");
		expect(patch.department).toBe("Finance");
		expect(patch.startDate).toBe(toContractDatetime("2026-09-10"));
		expect(patch.contractExpiryDate).toBe(toContractDatetime("2027-01-15"));
		expect(patch.amount).toBe(600000);
		expect(patch.currencyCode).toBe("USD");
		expect(patch.daysUntilExpiry).toBeTypeOf("number");
	});

	it("does not overwrite with blank MetaCard values", () => {
		const patch = buildNegotiatedContractPatch(`# Title Only

- Other party: —
- Expiry date: —

Some prose without dates.
`);
		expect(patch.contractName).toBe("Title Only");
		expect(patch.vendor).toBeUndefined();
		expect(patch.contractExpiryDate).toBeUndefined();
	});

	it("refreshes MetaCard from body after a redline-style body change", () => {
		const prior = [
			{ label: "Effective date", value: "2026-09-07" },
			{ label: "Expiry date", value: "2026-12-31" },
			{ label: "Other party", value: "Old Party" },
		];
		const nextText = `# Grant

- Effective date: 2026-09-07
- Expiry date: 2026-12-31
- Other party: Old Party

Effective Date: 2026-09-10
`;
		const refreshed = refreshSnapshotMetadata(nextText, prior);
		const effective = refreshed.find((row) =>
			/effective date/i.test(row.label),
		);
		expect(effective?.value).toBe("2026-09-10");
	});

	it("normalizes YYYY-MM-DD to noon UTC ISO", () => {
		expect(toContractDatetime("2026-09-07")).toBe("2026-09-07T12:00:00.000Z");
		expect(toContractDatetime("—")).toBeUndefined();
	});

	it("rewrites MetaCard lines after a body date accept", () => {
		const text = `# Grant

- Effective date: 2026-09-07
- Expiry date: 2026-12-31

Effective Date: 2026-09-10
`;
		const metadata = refreshSnapshotMetadata(text);
		const next = withRefreshedMetadataBlock(text, metadata);
		expect(next).toContain("- Effective date: 2026-09-10");
		expect(next).toContain("Effective Date: 2026-09-10");
	});
});
