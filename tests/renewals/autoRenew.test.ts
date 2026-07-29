import { describe, expect, it } from "vitest";
import {
	computeNextExpiryDate,
	computeTermDays,
	daysUntilExpiry,
	isExpiryReachedOrPassed,
	parseDateOnly,
	shouldAutoRenew,
	toDateOnlyString,
} from "@/lib/renewals/autoRenew";

describe("parseDateOnly / toDateOnlyString", () => {
	it("parses date-only and datetime strings", () => {
		const d = parseDateOnly("2027-09-30");
		expect(d).not.toBeNull();
		expect(toDateOnlyString(d!)).toBe("2027-09-30");

		const d2 = parseDateOnly("2027-09-30T12:00:00.000Z");
		expect(toDateOnlyString(d2!)).toBe("2027-09-30");
	});

	it("returns null for invalid input", () => {
		expect(parseDateOnly(null)).toBeNull();
		expect(parseDateOnly("")).toBeNull();
		expect(parseDateOnly("not-a-date")).toBeNull();
	});
});

describe("computeTermDays", () => {
	it("returns whole days in term", () => {
		expect(computeTermDays("2026-10-01", "2027-09-30")).toBe(364);
	});

	it("returns null when start missing or after expiry", () => {
		expect(computeTermDays(null, "2027-09-30")).toBeNull();
		expect(computeTermDays("2028-01-01", "2027-09-30")).toBeNull();
	});
});

describe("computeNextExpiryDate", () => {
	it("extends by same term length when start exists", () => {
		// 364-day term → next expiry = current + 364
		expect(
			computeNextExpiryDate({
				startDate: "2026-10-01",
				expiryDate: "2027-09-30",
			}),
		).toBe("2028-09-28");
	});

	it("falls back to +1 year when start missing", () => {
		expect(
			computeNextExpiryDate({
				startDate: null,
				expiryDate: "2027-09-30",
			}),
		).toBe("2028-09-30");
	});
});

describe("daysUntilExpiry / isExpiryReachedOrPassed", () => {
	it("computes days relative to a fixed now", () => {
		const now = new Date(2027, 8, 20); // Sep 20, 2027 local
		expect(daysUntilExpiry("2027-09-30", now)).toBe(10);
		expect(isExpiryReachedOrPassed("2027-09-30", now)).toBe(false);
		expect(isExpiryReachedOrPassed("2027-09-20", now)).toBe(true);
		expect(isExpiryReachedOrPassed("2027-09-19", now)).toBe(true);
	});
});

describe("shouldAutoRenew", () => {
	it("requires explicit true", () => {
		expect(shouldAutoRenew({ autoRenew: true })).toBe(true);
		expect(shouldAutoRenew({ autoRenew: false })).toBe(false);
		expect(shouldAutoRenew({})).toBe(false);
	});
});
