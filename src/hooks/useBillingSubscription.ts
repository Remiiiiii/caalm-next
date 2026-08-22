"use client";

import useSWR from "swr";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { DEFAULT_PRICING_PLANS } from "@/lib/pricing-defaults";
import type { PricingPlan } from "@/lib/pricing";

export type BillingSubscriptionPayload = {
	subscriptionTier: "starter" | "growth" | "enterprise";
	billingInterval: string | null;
	stripeConfigured: boolean;
	access?: { canCheckout?: boolean };
	plans: PricingPlan[];
};

async function fetchBillingSubscription([url, orgId]: [
	string,
	string,
]): Promise<BillingSubscriptionPayload> {
	const res = await fetch(url, {
		cache: "no-store",
		headers: { "x-org-id": orgId },
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || "Failed to load plans");
	}
	return res.json();
}

export function billingSubscriptionUrl(orgId: string): string {
	return `/api/billing/subscription?orgId=${encodeURIComponent(orgId)}`;
}

/** Prefetch from the sidebar so the upgrade modal already has Stripe state. */
export function useBillingSubscription() {
	const { orgId } = useOrganization();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const canBilling = permissions.includes(PERMISSIONS.SETTINGS.BILLING);
	const resolvedOrgId = orgId || "default_organization";
	const url = billingSubscriptionUrl(resolvedOrgId);

	const { data, error, isLoading } = useSWR(
		!permissionsLoading && canBilling ? [url, resolvedOrgId] : null,
		fetchBillingSubscription,
		{
			dedupingInterval: 15000,
			revalidateOnFocus: true,
		},
	);

	const plans: PricingPlan[] =
		data?.plans?.length ? data.plans : DEFAULT_PRICING_PLANS;

	return {
		canBilling,
		resolvedOrgId,
		plans,
		subscription: data ?? null,
		error: error instanceof Error ? error.message : null,
		isLoading: canBilling && isLoading && !data,
	};
}
