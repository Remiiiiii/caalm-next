import { describe, expect, it } from "vitest";
import { PlanLimitError, resolveTier } from "@/lib/billing/planLimits";
import { TIER_LIMITS } from "@/lib/stripe/prices";

describe("planLimits", () => {
	it("resolves unknown tiers to starter", () => {
		expect(resolveTier("")).toBe("starter");
		expect(resolveTier("GROWTH")).toBe("growth");
		expect(resolveTier("nope")).toBe("starter");
	});

	it("includes license caps alongside contracts (Growth+ unlimited)", () => {
		expect(TIER_LIMITS.starter.maxLicenses).toBe(100);
		expect(TIER_LIMITS.growth.maxLicenses).toBe(Number.POSITIVE_INFINITY);
		expect(TIER_LIMITS.enterprise.maxLicenses).toBe(Number.POSITIVE_INFINITY);
		expect(TIER_LIMITS.starter.maxContracts).toBe(100);
		expect(TIER_LIMITS.growth.maxContracts).toBe(2500);
	});

	it("PlanLimitError carries upgrade-oriented message and code", () => {
		const err = new PlanLimitError({
			kind: "users",
			limit: 10,
			used: 10,
			tier: "starter",
		});
		expect(err.code).toBe("PLAN_LIMIT_EXCEEDED");
		expect(err.message).toMatch(/Upgrade in Settings → Billing/);
		expect(err.kind).toBe("users");
	});
});
