"use client";

import useSWR from "swr";
import type { AuditReadinessSummary } from "@/lib/analytics/audit-readiness.types";
import type { AuditPeriod } from "@/lib/audits/types";
import { fetcher } from "@/lib/swr-config";

interface AuditReadinessResponse {
	success?: boolean;
	data?: AuditReadinessSummary;
}

interface UseAuditReadinessOptions {
	period?: AuditPeriod;
	calendar?: {
		complianceRate: number | null;
		atRisk: number;
		overdue: number;
	} | null;
}

export function useAuditReadiness(options: UseAuditReadinessOptions = {}) {
	const { period = "30d", calendar } = options;

	const params = new URLSearchParams({ period });
	if (calendar) {
		if (calendar.complianceRate !== null) {
			params.set("calendarComplianceRate", String(calendar.complianceRate));
		}
		params.set("calendarAtRisk", String(calendar.atRisk));
		params.set("calendarOverdue", String(calendar.overdue));
	}

	const { data, error, isLoading, mutate } = useSWR<AuditReadinessResponse>(
		`/api/analytics/audit-readiness?${params.toString()}`,
		fetcher,
		{
			refreshInterval: 120000,
			revalidateOnFocus: false,
			dedupingInterval: 60000,
		},
	);

	return {
		summary: data?.data ?? null,
		isLoading,
		error,
		refresh: mutate,
	};
}
