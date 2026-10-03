"use client";

import useSWR from "swr";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
	formatSubscriptionLabel,
	getSubscriptionLabelParts,
} from "@/lib/billing/entitlements";

type OrgPlanPayload = {
	orgId: string | null;
	subscriptionTier?: string;
	billingStatus?: string | null;
	orgStatus?: string | null;
	currentPeriodEnd?: string | null;
	pilotMonths?: number | null;
};

async function fetchOrgPlan(url: string): Promise<OrgPlanPayload> {
	try {
		const res = await fetch(url, {
			cache: "no-store",
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			return { orgId: null };
		}
		return res.json();
	} catch {
		return { orgId: null };
	}
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
	const labelInput = {
		tier,
		billingStatus: data?.billingStatus,
		orgStatus: data?.orgStatus,
		currentPeriodEnd: data?.currentPeriodEnd,
		pilotMonths: data?.pilotMonths,
	};
	const label = formatSubscriptionLabel(labelInput);
	const parts = getSubscriptionLabelParts(labelInput);

	return {
		tier,
		label,
		planName: parts.planName,
		isTrial: parts.isTrial,
		daysRemaining: parts.daysRemaining,
		isLoading,
		orgId: data?.orgId ?? orgId,
	};
}
