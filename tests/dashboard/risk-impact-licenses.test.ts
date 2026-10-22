import { describe, expect, it } from "vitest";
import {
	computePortfolioProtected,
	isExpiredLicense,
	isHighRiskLicense,
} from "@/lib/dashboard/risk-impact.service";

const day = 24 * 60 * 60 * 1000;
const isoDate = (offsetDays: number) =>
	new Date(Date.now() + offsetDays * day).toISOString().split("T")[0];

describe("risk impact: licenses in portfolio protected", () => {
	it("splits face value by type and sums to the headline", () => {
		const slices = computePortfolioProtected(
			[
				{ $id: "c1", amount: 1000, contractExpiryDate: isoDate(100) },
				{
					$id: "g1",
					amount: 500,
					contractType: "grant",
					contractExpiryDate: isoDate(100),
				},
				// Expired contracts are counted as inventory but carry no protected value.
				{ $id: "c2", amount: 9999, contractExpiryDate: isoDate(-5) },
			],
			[
				{ $id: "l1", cost: "$25", licenseExpiryDate: isoDate(100) },
				{ $id: "l2", cost: 400, licenseExpiryDate: isoDate(-1) },
			],
		);

		expect(slices.contracts).toEqual({ count: 2, amount: 1000 });
		expect(slices.grants).toEqual({ count: 1, amount: 500 });
		expect(slices.licenses).toEqual({ count: 2, amount: 25 });
		expect(
			slices.contracts.amount + slices.grants.amount + slices.licenses.amount,
		).toBe(1525);
	});

	it("is empty when the viewer cannot see contracts or licenses", () => {
		const slices = computePortfolioProtected([], []);
		expect(slices.contracts.amount + slices.licenses.amount).toBe(0);
	});
});

describe("risk impact: license exposure", () => {
	it("treats past expiry dates as expired and missing dates as open", () => {
		expect(isExpiredLicense({ $id: "a", licenseExpiryDate: isoDate(-1) })).toBe(
			true,
		);
		expect(isExpiredLicense({ $id: "b", licenseExpiryDate: isoDate(30) })).toBe(
			false,
		);
		expect(isExpiredLicense({ $id: "c" })).toBe(false);
	});

	it("flags at-risk compliance values, however they are spelled", () => {
		expect(isHighRiskLicense({ $id: "a", compliance: "Action Required" })).toBe(
			true,
		);
		expect(isHighRiskLicense({ $id: "b", compliance: "non-compliant" })).toBe(
			true,
		);
		expect(isHighRiskLicense({ $id: "c", compliance: "compliant" })).toBe(
			false,
		);
		expect(isHighRiskLicense({ $id: "d" })).toBe(false);
	});
});
