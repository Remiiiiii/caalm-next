/**
 * Unit tests for billing entitlements (pilot, grace, tier caps).
 */

import { describe, expect, it } from "vitest";
import {
	assertWithinLimit,
	BillingLimitError,
	getTierLimits,
	PILOT_MONTH_OPTIONS,
	resolveBillingAccess,
	settingsFromTier,
} from "@/lib/billing/entitlements";
import type { Organization } from "@/lib/rbac/organizations";

function org(partial: Partial<Organization>): Organization {
	return {
		$id: "org_1",
		name: "Test Org",
		subscriptionTier: "starter",
		status: "active",
		settings: { maxUsers: 10, maxDepartments: 3, features: [] },
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		createdBy: "user_1",
		...partial,
	};
}

describe("resolveBillingAccess", () => {
	it("allows writes during an active pilot", () => {
		const ends = new Date();
		ends.setMonth(ends.getMonth() + 3);
		const access = resolveBillingAccess(
			org({
				billingStatus: "pilot",
				currentPeriodEnd: ends.toISOString(),
			}),
		);
		expect(access.state).toBe("pilot");
		expect(access.canWrite).toBe(true);
		expect(access.canCheckout).toBe(true);
	});

	it("locks writes when pilot has expired", () => {
		const ends = new Date();
		ends.setMonth(ends.getMonth() - 1);
		const access = resolveBillingAccess(
			org({
				billingStatus: "pilot",
				currentPeriodEnd: ends.toISOString(),
			}),
		);
		expect(access.state).toBe("locked_pilot_expired");
		expect(access.canWrite).toBe(false);
		expect(access.canCheckout).toBe(true);
	});

	it("allows grace writes for past_due within 7 days", () => {
		const since = new Date();
		since.setDate(since.getDate() - 2);
		const access = resolveBillingAccess(
			org({
				billingStatus: "past_due",
				settings: {
					maxUsers: 10,
					maxDepartments: 3,
					features: [],
					pastDueSince: since.toISOString(),
				},
			}),
		);
		expect(access.state).toBe("grace");
		expect(access.canWrite).toBe(true);
	});

	it("locks past_due after grace period", () => {
		const since = new Date();
		since.setDate(since.getDate() - 10);
		const access = resolveBillingAccess(
			org({
				billingStatus: "past_due",
				settings: {
					maxUsers: 10,
					maxDepartments: 3,
					features: [],
					pastDueSince: since.toISOString(),
				},
			}),
		);
		expect(access.state).toBe("locked_past_due");
		expect(access.canWrite).toBe(false);
	});

	it("locks orgs with no subscription", () => {
		const access = resolveBillingAccess(org({ billingStatus: "none" }));
		expect(access.state).toBe("locked_no_subscription");
		expect(access.canWrite).toBe(false);
	});
});

describe("tier limits", () => {
	it("exposes starter department cap of 3", () => {
		expect(getTierLimits("starter").maxDepartments).toBe(3);
		expect(settingsFromTier("starter").maxDepartments).toBe(3);
	});

	it("treats enterprise departments as unlimited", () => {
		expect(getTierLimits("enterprise").maxDepartments).toBeNull();
	});

	it("throws when department cap is reached", () => {
		expect(() =>
			assertWithinLimit({
				resource: "departments",
				used: 3,
				limits: getTierLimits("starter"),
			}),
		).toThrow(BillingLimitError);
	});

	it("allows department create under the cap", () => {
		expect(() =>
			assertWithinLimit({
				resource: "departments",
				used: 2,
				limits: getTierLimits("starter"),
			}),
		).not.toThrow();
	});

	it("pilot month options are 3–6", () => {
		expect([...PILOT_MONTH_OPTIONS]).toEqual([3, 4, 5, 6]);
	});
});
