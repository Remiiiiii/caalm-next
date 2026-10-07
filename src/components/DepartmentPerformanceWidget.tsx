"use client";

import { BarChart3, Target, TrendingUp, Users } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtime } from "@/hooks/useRealtime";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	DepartmentPerformanceMetrics,
	PerformanceTrend,
} from "@/lib/dashboard/department-performance";

interface PerformanceApiPayload extends DepartmentPerformanceMetrics {
	available: boolean;
	generatedAt: string;
}

interface PerformanceApiResponse {
	success: boolean;
	data?: PerformanceApiPayload;
	error?: string;
}

interface DepartmentPerformanceWidgetProps {
	/** Optional override for tests; live fetch is skipped when provided. */
	data?: {
		averageProductivity: number;
		meetingTargetCount: number;
		totalStaffCount: number;
		trend: PerformanceTrend;
	};
}

const fetcher = async (url: string): Promise<PerformanceApiPayload> => {
	const response = await fetch(url);
	const json = (await response.json()) as PerformanceApiResponse;
	if (!response.ok || !json.success || !json.data?.available) {
		throw new Error(json.error || "Department performance unavailable");
	}
	return json.data;
};

const DepartmentPerformanceWidget: React.FC<
	DepartmentPerformanceWidgetProps
> = ({ data: propData }) => {
	const useLiveFetch = !propData;

	const { data, error, isLoading, mutate } = useSWR<PerformanceApiPayload>(
		useLiveFetch ? "/api/analytics/departments/performance" : null,
		fetcher,
		{
			refreshInterval: 30_000,
			revalidateOnFocus: true,
			revalidateOnReconnect: true,
			dedupingInterval: 10_000,
			errorRetryCount: 2,
			errorRetryInterval: 5_000,
			keepPreviousData: true,
		},
	);

	const onRealtimeUpdate = useCallback(() => {
		void mutate();
	}, [mutate]);

	const contractsRealtime = useRealtime({
		collectionId: appwriteConfig.contractsCollectionId,
		enabled: useLiveFetch,
		onUpdate: onRealtimeUpdate,
	});

	const usersRealtime = useRealtime({
		collectionId: appwriteConfig.usersCollectionId,
		enabled: useLiveFetch,
		onUpdate: onRealtimeUpdate,
	});

	const performanceData = propData ??
		(data
			? {
					averageProductivity: data.averageProductivity,
					meetingTargetCount: data.meetingTargetCount,
					totalStaffCount: data.totalStaffCount,
					trend: data.trend,
				}
			: null);

	const analyticsUnavailable = useLiveFetch && Boolean(error);
	const realtimeFailed =
		useLiveFetch &&
		(contractsRealtime.connectionStatus === "error" ||
			usersRealtime.connectionStatus === "error" ||
			Boolean(contractsRealtime.error) ||
			Boolean(usersRealtime.error));

	const isLive =
		Boolean(propData) ||
		(Boolean(performanceData) && !analyticsUnavailable && !realtimeFailed);

	const getTrendIcon = (trend: string) => {
		switch (trend) {
			case "up":
				return <TrendingUp className="h-4 w-4 text-green" />;
			case "down":
				return <TrendingUp className="h-4 w-4 text-red rotate-180" />;
			case "stable":
				return <BarChart3 className="h-4 w-4 text-blue" />;
			default:
				return <TrendingUp className="h-4 w-4 text-slate-600" />;
		}
	};

	const getTrendColor = (trend: string) => {
		switch (trend) {
			case "up":
				return "text-green";
			case "down":
				return "text-red";
			case "stable":
				return "text-blue";
			default:
				return "text-slate-600";
		}
	};

	if (useLiveFetch && isLoading && !performanceData) {
		return (
			<Card className="w-full h-auto min-h-[200px] sm:min-h-[250px] lg:min-h-[290px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						Department Performance
					</CardTitle>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="flex items-center justify-center h-32">
						<div className="flex flex-col items-center gap-3">
							<div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
							<p className="text-xs text-slate-500 font-medium">
								Loading metrics...
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!performanceData || analyticsUnavailable) {
		return (
			<Card className="w-full h-auto min-h-[200px] sm:min-h-[250px] lg:min-h-[290px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
					<div className="flex items-center gap-2">
						<TrendingUp className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Department Performance
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="flex flex-col items-center justify-center h-32 gap-3">
						<div className="w-10 h-10 bg-red/10 rounded-full flex items-center justify-center">
							<TrendingUp className="h-5 w-5 text-red" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-slate-700">
								Data Unavailable
							</p>
							<p className="text-xs text-slate-500">
								Analytics or database is not available
							</p>
						</div>
						<div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
							<div className="w-2 h-2 rounded-full bg-red animate-pulse" />
							<span className="text-xs text-slate-600 font-medium">
								Performance Data Unavailable
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
			<div className="glass-card-cap" />
			<CardHeader className="pb-3 pt-6 px-4">
				<div className="flex items-center gap-2">
					<TrendingUp className="h-4 w-4 text-slate-600" />
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						Department Performance
					</CardTitle>
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-2">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div>
								<div className="text-3xl font-bold sidebar-gradient-text tracking-tight tabular-nums">
									{performanceData.averageProductivity}%
								</div>
								<div className="text-sm text-slate-600 capitalize font-medium">
									Average Productivity
								</div>
							</div>
						</div>

						<div className="text-right bg-white/20 rounded-lg px-3 py-1 backdrop-blur-sm border border-white/20">
							<div className="text-xs text-slate-500 font-medium">Trend</div>
							<div className="flex items-center gap-1">
								{getTrendIcon(performanceData.trend)}
								<span
									className={`text-lg font-semibold ${getTrendColor(
										performanceData.trend,
									)}`}
								>
									{performanceData.trend === "up"
										? "↗"
										: performanceData.trend === "down"
											? "↘"
											: "→"}
								</span>
							</div>
						</div>
					</div>
					<div className="h-px bg-slate-300" />
					<div className="grid grid-cols-2 gap-2">
						<div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-green/15 rounded-lg flex items-center justify-center">
									<Target className="h-4 w-4 text-green" />
								</div>
								<div>
									<div className="text-xs text-slate-500 font-medium">
										Meeting Target
									</div>
									<div className="text-sm font-bold text-slate-700 tabular-nums">
										{performanceData.meetingTargetCount}
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-blue/15 rounded-lg flex items-center justify-center">
									<Users className="h-4 w-4 text-blue" />
								</div>
								<div>
									<div className="text-xs text-slate-500 font-medium">
										Total Staff
									</div>
									<div className="text-sm font-bold text-slate-700 tabular-nums">
										{performanceData.totalStaffCount}
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="mt-3 border-t border-white/20">
						<div className="flex items-center justify-center">
							<div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
								<div
									className={`w-2 h-2 rounded-full animate-pulse ${
										isLive ? "bg-green" : "bg-red"
									}`}
								/>
								<span className="text-xs text-slate-600 font-medium">
									{isLive
										? "Live Performance Data"
										: "Performance Data Unavailable"}
								</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default DepartmentPerformanceWidget;
