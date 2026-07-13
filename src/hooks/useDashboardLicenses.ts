"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr-config";
import type { License } from "@/types/licenses";

interface LicensesResponse {
	success?: boolean;
	data?: { licenses?: License[] };
	licenses?: License[];
}

/**
 * Single SWR fetch for dashboard license widgets (pie chart + expiry alerts).
 */
export function useDashboardLicenses() {
	const { data, error, isLoading, mutate } = useSWR<LicensesResponse>(
		"/api/licenses",
		fetcher,
		{
			refreshInterval: 300000,
			revalidateOnFocus: false,
			dedupingInterval: 60000,
			revalidateOnMount: true,
		},
	);

	const licenses: License[] =
		data?.data?.licenses ?? data?.licenses ?? (data as any)?.licenses ?? [];

	return {
		licenses,
		isLoading,
		error,
		refresh: mutate,
	};
}
