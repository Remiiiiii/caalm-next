import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";

interface AnalyticsData {
	departments: unknown[];
	totals: {
		totalContracts: number;
		totalBudget: number;
		totalStaff: number;
		overallComplianceRate: number;
	};
	hasContracts: boolean;
	reports: unknown[];
	departmentsList: unknown[];
	reportTemplates: unknown[];
}

interface UnifiedAnalyticsDataResponse {
	data: AnalyticsData;
	timestamp: number;
}

const fetcher = async (url: string): Promise<UnifiedAnalyticsDataResponse> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to fetch unified analytics data");
	}
	return response.json();
};

export const useUnifiedAnalyticsData = (userId?: string | null) => {
	const { user } = useAuth();
	const effectiveUserId = userId || user?.$id;

	const { data, error, isLoading, mutate } = useSWR(
		effectiveUserId ? `/api/analytics/unified?userId=${effectiveUserId}` : null,
		fetcher,
		{
			refreshInterval: 60000, // Refresh every minute
			revalidateOnFocus: false, // Disable focus revalidation to prevent flickering
			revalidateOnReconnect: true,
			dedupingInterval: 30000, // Dedupe requests within 30 seconds
			errorRetryCount: 3,
			errorRetryInterval: 5000,
			revalidateIfStale: true,
			revalidateOnMount: true,
			keepPreviousData: true, // Keep previous data to prevent flickering
		},
	);

	return {
		// Data
		departments: data?.data?.departments || [],
		totals: data?.data?.totals || {
			totalContracts: 0,
			totalBudget: 0,
			totalStaff: 0,
			overallComplianceRate: 0,
		},
		hasContracts: data?.data?.hasContracts || false,
		reports: data?.data?.reports || [],
		departmentsList: data?.data?.departmentsList || [],
		reportTemplates: data?.data?.reportTemplates || [],

		// Loading states
		isLoading,
		error,

		// Actions
		refresh: mutate,
	};
};
