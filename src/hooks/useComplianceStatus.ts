"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr-config";
import type { ComplianceStatusSnapshot } from "@/lib/audits/types";

interface ComplianceStatusResponse {
	success?: boolean;
	data?: ComplianceStatusSnapshot;
}

export function useComplianceStatus() {
	const { data, error, isLoading, mutate } = useSWR<ComplianceStatusResponse>(
		"/api/audits/compliance-status",
		fetcher,
		{
			refreshInterval: 300000,
			revalidateOnFocus: false,
			dedupingInterval: 60000,
		},
	);

	return {
		snapshot: data?.data ?? null,
		isLoading,
		error,
		refresh: mutate,
	};
}
