"use client";

import useSWR from "swr";
import { getUserNotes, type Note } from "@/lib/actions/notes.actions";
import type { DepartmentPerformanceMetrics } from "@/lib/dashboard/department-performance";

export interface WidgetNewsItem {
	id: string;
	title: string;
	content: string;
	author: string;
	date: string;
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	department?: string;
	image?: string;
}

export interface DashboardWidgetBundle {
	newsItems: WidgetNewsItem[];
	newsTotal: number;
	newsViewer: {
		canCreate?: boolean;
		canManageFeeds?: boolean;
	};
	performance: DepartmentPerformanceMetrics | null;
	notes: Note[];
}

async function fetchWidgetBundle([, newsLimit, userId]: [
	string,
	number,
	string,
]): Promise<DashboardWidgetBundle> {
	const [newsRes, perfRes, notes] = await Promise.all([
		fetch(`/api/internal-news?limit=${newsLimit}`).then(async (response) => {
			if (!response.ok) {
				return { items: [] as WidgetNewsItem[], total: 0, viewer: {} };
			}
			return response.json();
		}),
		fetch("/api/analytics/departments/performance").then(async (response) => {
			const json = await response.json().catch(() => null);
			if (!response.ok || !json?.success || !json.data?.available) {
				return null;
			}
			return json.data as DepartmentPerformanceMetrics;
		}),
		userId ? getUserNotes(userId).catch(() => [] as Note[]) : Promise.resolve([]),
	]);

	const rawItems = Array.isArray(newsRes.items)
		? newsRes.items
		: Array.isArray(newsRes)
			? newsRes
			: [];
	const newsItems = rawItems.slice(0, newsLimit) as WidgetNewsItem[];

	return {
		newsItems,
		newsTotal: newsRes.total ?? newsItems.length,
		newsViewer: newsRes.viewer || {},
		performance: perfRes,
		notes,
	};
}

/**
 * Parallel first-paint payload for dashboard carousel widgets
 * (news, department performance, notes) so they settle together.
 */
export function useDashboardWidgetBundle({
	enabled,
	newsLimit = 5,
	userId,
}: {
	enabled: boolean;
	newsLimit?: number;
	userId?: string | null;
}) {
	const { data, error, isLoading } = useSWR(
		enabled ? ["dashboard-widget-bundle", newsLimit, userId ?? ""] : null,
		fetchWidgetBundle,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 60_000,
			keepPreviousData: true,
		},
	);

	return {
		bundle: data ?? null,
		isLoading: enabled && isLoading && !data,
		error,
	};
}
