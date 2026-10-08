"use client";

import useSWR from "swr";

export const NEWS_ANALYTICS_KEY = "/api/internal-news/analytics";

export interface NewsAnalyticsOverview {
	total?: number;
	published?: number;
	drafts?: number;
	archived?: number;
	thisMonth?: number;
	thisWeek?: number;
	categories?: number;
	categoryNames?: string[];
	previousMonth?: number;
	lastPublishedAt?: string | null;
}

export interface NewsAnalyticsPayload {
	overview?: NewsAnalyticsOverview;
	byType?: Record<string, number>;
	byPriority?: Record<string, number>;
	byDepartment?: Record<string, number>;
	engagement?: {
		totalViews: number;
		averageViews: number;
		mostViewed: Array<{
			id: string;
			title: string;
			views: number;
			type: string;
			publishedAt: string;
		}>;
	};
	trends?: Array<{ date: string; count: number }>;
}

interface NewsAnalyticsResponse {
	success?: boolean;
	analytics?: NewsAnalyticsPayload;
	error?: string;
}

async function fetchNewsAnalytics(url: string): Promise<NewsAnalyticsPayload> {
	const response = await fetch(url);
	const data = (await response.json().catch(() => ({}))) as NewsAnalyticsResponse;
	if (!response.ok || data.success === false) {
		throw new Error(data.error || "Failed to fetch analytics");
	}
	return data.analytics ?? {};
}

export function useNewsAnalytics(enabled = true) {
	const { data, error, isLoading, mutate } = useSWR(
		enabled ? NEWS_ANALYTICS_KEY : null,
		fetchNewsAnalytics,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 5_000,
			keepPreviousData: true,
		},
	);

	return {
		analytics: data ?? null,
		isLoading: enabled && isLoading && !data,
		error,
		refresh: mutate,
	};
}
