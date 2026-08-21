"use client";

import useSWR from "swr";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatSubscriptionLabel } from "@/lib/billing/entitlements";

type OrgPlanPayload = {
	orgId: string | null;
	subscriptionTier?: string;
	billingStatus?: string | null;
	orgStatus?: string | null;
	currentPeriodEnd?: string | null;
	pilotMonths?: number | null;
};

async function fetchOrgPlan(url: string): Promise<OrgPlanPayload> {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) {
		throw new Error("Could not load plan");
	}
	return res.json();
}

export function useOrgPlanSummary() {
	const { orgId } = useOrganization();
	const key = orgId
		? `/api/organization/default?orgId=${encodeURIComponent(orgId)}`
		: "/api/organization/default";

	const { data, isLoading } = useSWR(key, fetchOrgPlan, {
		revalidateOnFocus: true,
		dedupingInterval: 15000,
	});

	const tier = data?.subscriptionTier || "starter";
	const label = formatSubscriptionLabel({
		tier,
		billingStatus: data?.billingStatus,
		orgStatus: data?.orgStatus,
		currentPeriodEnd: data?.currentPeriodEnd,
		pilotMonths: data?.pilotMonths,
	});

	return {
		tier,
		label,
		isLoading,
		orgId: data?.orgId ?? orgId,
	};
}
