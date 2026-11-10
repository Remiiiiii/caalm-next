import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { isVisiblePendingInvitation } from "@/constants/status";
import { useAuth } from "@/contexts/AuthContext";
import { useClientCachedFallback } from "@/hooks/useClientCachedFallback";
import type { RiskImpactSnapshot } from "@/lib/dashboard/risk-impact.types";
import type { InvitationsUpdatedDetail } from "@/lib/ui/refreshDashboardInvitations";
import { clearCachedData, setCachedData } from "@/lib/utils/client-cache";
import type { License } from "@/types/licenses";

interface DashboardData {
	stats: {
		totalContracts: number;
		expiringContracts: number;
		activeUsers: number;
		complianceRate: string;
		statusBreakdown?: {
			active: number;
			draft: number;
			expired: number;
		};
		userComposition?: {
			superAdmin: number;
			orgAdmin: number;
			deptManager: number;
			unassigned: number;
			inactive: number;
			addedThisMonth: number;
		};
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
	riskImpact: RiskImpactSnapshot | null;
	dashboardLicenses: License[];
}

interface UnifiedDashboardDataResponse {
	data: DashboardData;
	timestamp: number;
}

const fetcher = async (url: string): Promise<UnifiedDashboardDataResponse> => {
	// Always hit the server after mutations; do not reuse a browser HTTP cache
	// of the previous pending-invitations payload.
	const response = await fetch(url, { cache: "no-store" });
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
	options?: { enabled?: boolean },
) => {
	const { user } = useAuth();
	const enabled = options?.enabled !== false;
	const effectiveUserId = serverUserId || user?.$id;
	const url =
		enabled && effectiveUserId
			? `/api/dashboard/unified?orgId=${orgId}&userId=${effectiveUserId}&v=21`
			: null;

	// After mount only — reading localStorage during the first client paint
	// would disagree with SSR (no cache on the server) and break hydration.
	const fallbackData =
		useClientCachedFallback<UnifiedDashboardDataResponse>(url);

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

	const refresh = useCallback(
		(
			data?:
				| UnifiedDashboardDataResponse
				| Promise<UnifiedDashboardDataResponse>,
			options?: { revalidate?: boolean; populateCache?: boolean },
		) => {
			if (url && options?.revalidate !== false) {
				clearCachedData(url);
			}
			return mutate(data, options);
		},
		[mutate, url],
	);

	const prependInvitation = useCallback(
		async (invitation: unknown) => {
			await mutate(
				(current) => {
					if (!current?.data) return current;
					const existing = current.data.invitations || [];
					const token = (invitation as { token?: string }).token;
					if (
						token &&
						existing.some((inv) => (inv as { token?: string }).token === token)
					) {
						return current;
					}
					const next: UnifiedDashboardDataResponse = {
						...current,
						timestamp: Date.now(),
						data: {
							...current.data,
							invitations: [invitation, ...existing],
						},
					};
					if (url) setCachedData(url, next, 300000);
					return next;
				},
				{ revalidate: false },
			);
		},
		[mutate, url],
	);

	// Ask CAALM (and other non-dashboard paths) broadcast new invite rows here
	// so the table updates without waiting on a stale unified revalidate.
	useEffect(() => {
		if (!url) return;

		const onInvitationsUpdated = (event: Event) => {
			const detail = (event as CustomEvent<InvitationsUpdatedDetail>).detail;
			const rows = detail?.prepend ?? [];
			if (rows.length === 0) {
				clearCachedData(url);
				void mutate();
				return;
			}
			void (async () => {
				for (const row of rows) {
					await prependInvitation(row);
				}
				// Later merge with server — keep optimistic rows if the refetch is still stale.
				window.setTimeout(() => {
					void mutate(
						async (current) => {
							try {
								const fresh = await fetcher(url);
								if (!current?.data) return fresh;
								const freshInv = fresh.data.invitations || [];
								const freshTokens = new Set(
									freshInv
										.map((inv) => (inv as { token?: string }).token)
										.filter(Boolean),
								);
								const keepOptimistic = (current.data.invitations || []).filter(
									(inv) => {
										const token = (inv as { token?: string }).token;
										if (!token || freshTokens.has(token)) return false;
										return rows.some((row) => row.token === token);
									},
								);
								const merged: UnifiedDashboardDataResponse = {
									...fresh,
									data: {
										...fresh.data,
										invitations: [...keepOptimistic, ...freshInv],
									},
								};
								setCachedData(url, merged, 300000);
								return merged;
							} catch {
								return current;
							}
						},
						{ revalidate: false },
					);
				}, 800);
			})();
		};

		window.addEventListener("caalm:invitations-updated", onInvitationsUpdated);
		return () => {
			window.removeEventListener(
				"caalm:invitations-updated",
				onInvitationsUpdated,
			);
		};
	}, [url, mutate, prependInvitation]);

	const removeInvitation = useCallback(
		async (token: string) => {
			await mutate(
				(current) => {
					if (!current?.data) return current;
					const existing = current.data.invitations || [];
					return {
						...current,
						data: {
							...current.data,
							invitations: existing.filter((inv) => {
								const row = inv as {
									token?: string;
									status?: string;
									revoked?: unknown;
								};
								if (row.token === token) return false;
								return isVisiblePendingInvitation(row);
							}),
						},
					};
				},
				{ revalidate: false },
			);
		},
		[mutate],
	);

	const invitations = useMemo(() => {
		const rows = data?.data?.invitations || [];
		return rows.filter((inv) =>
			isVisiblePendingInvitation(inv as { status?: string; revoked?: unknown }),
		);
	}, [data?.data?.invitations]);

	return {
		// Data
		stats: data?.data?.stats || {
			totalContracts: 0,
			expiringContracts: 0,
			activeUsers: 0,
			complianceRate: "0%",
			statusBreakdown: { active: 0, draft: 0, expired: 0 },
			userComposition: {
				superAdmin: 0,
				orgAdmin: 0,
				deptManager: 0,
				unassigned: 0,
				inactive: 0,
				addedThisMonth: 0,
			},
		},
		files: data?.data?.files || [],
		invitations,
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
		riskImpact: data?.data?.riskImpact ?? null,
		dashboardLicenses: data?.data?.dashboardLicenses || [],

		// Loading states
		isLoading,
		error,

		/** Server/cache timestamp from the last successful unified fetch */
		lastUpdatedAt: data?.timestamp ?? null,

		// Actions
		refresh,
		prependInvitation,
		removeInvitation,
	};
};
