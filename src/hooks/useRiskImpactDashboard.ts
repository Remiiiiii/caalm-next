import { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useClientCachedFallback } from "@/hooks/useClientCachedFallback";
import type {
	RiskImpactPeriod,
	RiskImpactSnapshot,
} from "@/lib/dashboard/risk-impact.types";
import { fetcher } from "@/lib/swr-config";
import { setCachedData } from "@/lib/utils/client-cache";

interface RiskImpactResponse {
	success: boolean;
	data: RiskImpactSnapshot;
	timestamp: number;
}

export function useRiskImpactDashboard(options?: {
	period?: RiskImpactPeriod;
	division?: string;
	initialData?: RiskImpactSnapshot | null;
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
			v: "5",
		});
		if (division) params.set("division", division);
		return `/api/dashboard/risk-impact?${params.toString()}`;
	}, [user?.$id, orgId, period, division]);

	const localFallback = useClientCachedFallback<RiskImpactResponse>(url);

	// Server-prefetched data for the initial ytd period — eliminates the skeleton
	// flash. When the user switches periods the key changes and SWR fetches fresh.
	const serverFallback = useMemo((): RiskImpactResponse | undefined => {
		if (!options?.initialData || period !== "ytd") return undefined;
		return { success: true, data: options.initialData, timestamp: Date.now() };
	}, [options?.initialData, period]);

	const { data, error, isLoading, mutate } = useSWR<RiskImpactResponse>(
		url,
		fetcher,
		{
			refreshInterval: 120000,
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 60000,
			keepPreviousData: true,
			fallbackData: serverFallback ?? localFallback,
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
