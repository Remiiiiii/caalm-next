/**
 * Unit tests for Stripe price ID ↔ tier mapping
 */

import { afterEach, describe, expect, it } from "vitest";
import { getPriceId, getTierFromPriceId } from "@/lib/stripe/prices";

const PRICE_ENV = {
	STRIPE_PRICE_STARTER_MONTHLY: "price_starter_monthly",
	STRIPE_PRICE_STARTER_YEARLY: "price_starter_yearly",
	STRIPE_PRICE_GROWTH_MONTHLY: "price_growth_monthly",
	STRIPE_PRICE_GROWTH_YEARLY: "price_growth_yearly",
	STRIPE_PRICE_ENTERPRISE_MONTHLY: "price_enterprise_monthly",
	STRIPE_PRICE_ENTERPRISE_YEARLY: "price_enterprise_yearly",
} as const;

describe("stripe prices mapping", () => {
	afterEach(() => {
		for (const key of Object.keys(PRICE_ENV)) {
			delete process.env[key];
		}
	});

	it("maps tier + interval to price id from env", () => {
		Object.assign(process.env, PRICE_ENV);
		expect(getPriceId("starter", "monthly")).toBe("price_starter_monthly");
		expect(getPriceId("growth", "yearly")).toBe("price_growth_yearly");
		expect(getPriceId("enterprise", "monthly")).toBe(
			"price_enterprise_monthly",
		);
	});

	it("reverse-maps price id to tier and interval", () => {
		Object.assign(process.env, PRICE_ENV);
		expect(getTierFromPriceId("price_growth_yearly")).toEqual({
			tier: "growth",
			interval: "yearly",
		});
		expect(getTierFromPriceId("price_unknown")).toBeNull();
	});

	it("throws when price env is missing", () => {
		expect(() => getPriceId("starter", "monthly")).toThrow(
			/STRIPE_PRICE_STARTER_MONTHLY/,
		);
	});
});
