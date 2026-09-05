import { describe, expect, it } from "vitest";
import {
	assertCrmProviderAccess,
	canAccessCrmProvider,
	CrmEntitlementError,
} from "./entitlements";

describe("CRM provider entitlements", () => {
	it("blocks Starter from both connectors", () => {
		expect(canAccessCrmProvider("starter", "hubspot")).toBe(false);
		expect(canAccessCrmProvider("starter", "salesforce")).toBe(false);
		expect(() =>
			assertCrmProviderAccess({ subscriptionTier: "starter" }, "hubspot"),
		).toThrow(CrmEntitlementError);
	});

	it("allows Growth HubSpot and blocks Growth Salesforce", () => {
		expect(canAccessCrmProvider("growth", "hubspot")).toBe(true);
		expect(canAccessCrmProvider("growth", "salesforce")).toBe(false);
		assertCrmProviderAccess({ subscriptionTier: "growth" }, "hubspot");
		expect(() =>
			assertCrmProviderAccess({ subscriptionTier: "growth" }, "salesforce"),
		).toThrow(/Enterprise/);
	});

	it("allows Enterprise both providers", () => {
		expect(canAccessCrmProvider("enterprise", "hubspot")).toBe(true);
		expect(canAccessCrmProvider("enterprise", "salesforce")).toBe(true);
		assertCrmProviderAccess({ subscriptionTier: "enterprise" }, "hubspot");
		assertCrmProviderAccess({ subscriptionTier: "enterprise" }, "salesforce");
	});
});
