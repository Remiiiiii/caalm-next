import { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import type {
	RiskImpactPeriod,
	RiskImpactSnapshot,
} from "@/lib/dashboard/risk-impact.types";
import { fetcher } from "@/lib/swr-config";
import { getCachedData, setCachedData } from "@/lib/utils/client-cache";

interface RiskImpactResponse {
	success: boolean;
	data: RiskImpactSnapshot;
	timestamp: number;
}

export function useRiskImpactDashboard(options?: {
	period?: RiskImpactPeriod;
	division?: string;
}) {
	const { user } = useAuth();
	const { orgId } = useOrganization();
	const period = options?.period || "ytd";
	const division = options?.division;

	const url = useMemo(() => {
		if (!user?.$id) return null;
		const params = new URLSearchParams({
			orgId: orgId || "default_organization",
			period,
			v: "2",
		});
		if (division) params.set("division", division);
		return `/api/dashboard/risk-impact?${params.toString()}`;
	}, [user?.$id, orgId, period, division]);

	const fallbackData = useMemo(() => {
		if (!url || typeof window === "undefined") return undefined;
		return getCachedData<RiskImpactResponse>(url) ?? undefined;
	}, [url]);

	const { data, error, isLoading, mutate } = useSWR<RiskImpactResponse>(
		url,
		fetcher,
		{
			refreshInterval: 120000,
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 60000,
			keepPreviousData: true,
			fallbackData,
			onSuccess: (payload) => {
				if (url && typeof window !== "undefined") {
					setCachedData(url, payload, 120000);
				}
			},
		},
	);

	return {
		snapshot: data?.data ?? null,
		error,
		isLoading: Boolean(url) && isLoading && !data,
		refresh: mutate,
	};
}
