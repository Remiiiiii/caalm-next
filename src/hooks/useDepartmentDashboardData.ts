import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useClientCachedFallback } from "@/hooks/useClientCachedFallback";
import type { DepartmentDashboardData } from "@/lib/dashboard/department-dashboard.types";
import { fetcher } from "@/lib/swr-config";
import { setCachedData } from "@/lib/utils/client-cache";

interface DepartmentDashboardResponse {
	success: boolean;
	data: DepartmentDashboardData;
	timestamp: number;
}

export function useDepartmentDashboardData(division?: string) {
	const { user } = useAuth();
	const { orgId } = useOrganization();

	const resolvedDivision =
		division || (user as { division?: string } | null)?.division || "";

	const url =
		user?.$id && resolvedDivision
			? `/api/dashboard/department?orgId=${orgId || "default_organization"}&division=${encodeURIComponent(resolvedDivision)}`
			: null;

	const fallbackData =
		useClientCachedFallback<DepartmentDashboardResponse>(url);

	const { data, error, isLoading, mutate } =
		useSWR<DepartmentDashboardResponse>(url, fetcher, {
			refreshInterval: 120000,
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 60000,
			fallbackData,
			onSuccess: (payload) => {
				if (url && typeof window !== "undefined") {
					setCachedData(url, payload, 120000);
				}
			},
		});

	return {
		data: data?.data ?? null,
		error,
		isLoading: Boolean(url) && isLoading && !data,
		refresh: mutate,
		division: resolvedDivision,
	};
}
