import { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { getCachedData, setCachedData } from "@/lib/utils/client-cache";

interface DashboardData {
	stats: {
		totalContracts: number;
		expiringContracts: number;
		activeUsers: number;
		complianceRate: string;
	};
	files: unknown[];
	invitations: unknown[];
	authUsers: unknown[];
	uninvitedUsers: unknown[];
	contracts: unknown[];
	reports: unknown[];
	departments: unknown[];
	reportTemplates: unknown[];
	notifications: unknown[];
	notificationsStats: unknown;
	recentActivities: unknown[];
	calendarEvents: unknown[];
}

interface UnifiedDashboardDataResponse {
	data: DashboardData;
	timestamp: number;
}

const fetcher = async (url: string): Promise<UnifiedDashboardDataResponse> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to fetch unified dashboard data");
	}
	const data = await response.json();

	// Cache the response client-side for stale-while-revalidate
	if (typeof window !== "undefined") {
		setCachedData(url, data, 300000); // 5 minutes
	}

	return data;
};

export const useUnifiedDashboardData = (
	orgId: string,
	serverUserId?: string | null,
) => {
	const { user } = useAuth();
	const effectiveUserId = serverUserId || user?.$id;
	const url = effectiveUserId
		? `/api/dashboard/unified?orgId=${orgId}&userId=${effectiveUserId}&v=3`
		: null;

	// Get cached data as fallback for stale-while-revalidate
	const fallbackData = useMemo(() => {
		if (!url || typeof window === "undefined") return undefined;
		return getCachedData<UnifiedDashboardDataResponse>(url) ?? undefined;
	}, [url]);

	const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
		refreshInterval: 120000, // Refresh every 2 minutes
		revalidateOnFocus: false, // Disable focus revalidation to prevent flickering
		revalidateOnReconnect: true,
		dedupingInterval: 60000, // Dedupe requests within 1 minute
		errorRetryCount: 2, // Reduced retries for faster failure
		errorRetryInterval: 3000, // Faster retry interval
		revalidateIfStale: true,
		revalidateOnMount: true,
		keepPreviousData: true, // Keep previous data to prevent flickering
		fallbackData, // Stale-while-revalidate: show cached data immediately
		// Only log in development
		onError: (err) => {
			if (process.env.NODE_ENV === "development") {
				console.error("Dashboard data fetch error:", err);
			}
		},
		onSuccess: (data) => {
			// Update cache when fresh data arrives
			if (url && typeof window !== "undefined") {
				setCachedData(url, data, 300000);
			}
		},
	});

	return {
		// Data
		stats: data?.data?.stats || {
			totalContracts: 0,
			expiringContracts: 0,
			activeUsers: 0,
			complianceRate: "94%",
		},
		files: data?.data?.files || [],
		invitations: data?.data?.invitations || [],
		authUsers: data?.data?.authUsers || [],
		uninvitedUsers: data?.data?.uninvitedUsers || [],
		contracts: data?.data?.contracts || [],
		reports: data?.data?.reports || [],
		departments: data?.data?.departments || [],
		reportTemplates: data?.data?.reportTemplates || [],
		notifications: data?.data?.notifications || [],
		notificationsStats: data?.data?.notificationsStats || {},
		recentActivities: data?.data?.recentActivities || [],
		calendarEvents: data?.data?.calendarEvents || [],

		// Loading states
		isLoading,
		error,

		/** Server/cache timestamp from the last successful unified fetch */
		lastUpdatedAt: data?.timestamp ?? null,

		// Actions
		refresh: mutate,
	};
};
