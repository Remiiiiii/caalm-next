import {
	BillingLimitError,
	normalizePricingTier,
} from "@/lib/billing/entitlements";
import type { Organization } from "@/lib/rbac/organizations";
import type { PricingTier } from "@/lib/stripe/prices";
import type { CrmProvider } from "./types";

export class CrmEntitlementError extends BillingLimitError {
	constructor(message: string) {
		super(message, "TIER_LIMIT", 403);
		this.name = "CrmEntitlementError";
	}
}

export function canAccessCrmProvider(
	tier: PricingTier,
	provider: CrmProvider,
): boolean {
	if (provider === "hubspot") {
		return tier === "growth" || tier === "enterprise";
	}
	if (provider === "salesforce") {
		return tier === "enterprise";
	}
	return false;
}

export function requiredTierForCrmProvider(provider: CrmProvider): string {
	return provider === "salesforce" ? "Enterprise" : "Growth";
}

export function assertCrmProviderAccess(
	org: Pick<Organization, "subscriptionTier">,
	provider: CrmProvider,
): void {
	const tier = normalizePricingTier(org.subscriptionTier);
	if (!canAccessCrmProvider(tier, provider)) {
		const required = requiredTierForCrmProvider(provider);
		const label = provider === "hubspot" ? "HubSpot" : "Salesforce";
		throw new CrmEntitlementError(
			`${label} CRM origin is available on the ${required} plan. Upgrade in Settings → Billing.`,
		);
	}
}
