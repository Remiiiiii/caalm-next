import { describe, expect, it } from "vitest";
import { computeLiveReadinessScore, computeRag } from "@/lib/audits/readiness/score";
import { cadencesDueNow, localDayKey } from "@/lib/audits/readiness/timezone";

describe("audit readiness score", () => {
	it("returns null when no live sources exist", () => {
		const result = computeLiveReadinessScore({
			contractComplianceRate: null,
			licenseRenewalHealth: null,
		});
		expect(result.score).toBeNull();
		expect(result.sourcesUsed).toEqual([]);
	});

	it("averages live contract and license rates without a baseline", () => {
		const result = computeLiveReadinessScore({
			contractComplianceRate: 80,
			licenseRenewalHealth: 100,
		});
		expect(result.score).toBe(90);
		expect(result.sourcesUsed).toEqual(["Contracts", "Licenses"]);
		expect(computeRag(result.score)).toBe("green");
	});
});

describe("audit readiness timezone cadence", () => {
	it("fires weekly on Monday local (any hour)", () => {
		// 2026-08-17 is a Monday; 13:30 UTC ≈ 09:30 America/New_York (EDT)
		const date = new Date("2026-08-17T13:30:00.000Z");
		expect(cadencesDueNow(date, "America/New_York")).toContain("weekly");
		expect(localDayKey(date, "America/New_York")).toBe("2026-08-17");
	});

	it("does not fire weekly on Tuesday local", () => {
		const date = new Date("2026-08-18T13:30:00.000Z");
		expect(cadencesDueNow(date, "America/New_York")).not.toContain("weekly");
	});
});
