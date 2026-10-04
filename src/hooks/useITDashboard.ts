/**
 * Hook for fetching IT dashboard overview data
 */

import useSWR from "swr";
import { swrConfig } from "@/lib/swr-config";

export interface ITDashboardData {
	telemetryConfigured: boolean;
	notice?: string;
	systemHealth: {
		status: "healthy" | "degraded" | "down";
		uptime: number | null;
		services: Array<{
			name: string;
			status: "up" | "down" | "degraded";
			responseTime: number | null;
			detail?: string;
		}>;
	};
	recentAlerts: Array<{
		id: string;
		severity: "critical" | "warning" | "info";
		message: string;
		timestamp: string;
	}>;
	quickStats: {
		apiRequests: number | null;
		deployments: number | null;
		activeIncidents: number | null;
		systemLoad: number | null;
		processHeapUsedMb?: number | null;
		processUptimeSeconds?: number | null;
		processUptimeLabel?: string | null;
	};
	timestamp: string;
}

const fetcher = async (url: string): Promise<ITDashboardData> => {
	const response = await fetch(url);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || "Failed to fetch IT dashboard data");
	}
	const data = await response.json();
	if (!data.success || !data.data) {
		throw new Error("Invalid response format");
	}
	return data.data;
};

export interface UseITDashboardOptions {
	enableRealTime?: boolean;
	pollingInterval?: number;
}

export const useITDashboard = ({
	enableRealTime = true,
	pollingInterval = 30000,
}: UseITDashboardOptions = {}) => {
	const { data, error, isLoading, mutate } = useSWR(
		"/api/it/dashboard",
		fetcher,
		{
			...swrConfig,
			refreshInterval: enableRealTime ? pollingInterval : 0,
			revalidateOnFocus: true,
		},
	);

	const refresh = () => mutate();

	return {
		dashboard: data,
		isLoading,
		error: error ? "Failed to load IT dashboard data" : null,
		refresh,
	};
};
