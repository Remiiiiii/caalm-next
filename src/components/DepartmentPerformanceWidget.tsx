"use client";

import {
	type LucideIcon,
	SquareArrowOutUpRight,
	TrendingDown,
	TrendingUp,
	Triangle,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { useRealtime } from "@/hooks/useRealtime";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	DEPARTMENT_COMPLIANCE_TARGET,
	type DepartmentPerformanceMetrics,
	type PerformanceStatus,
	type PerformanceTrend,
	resolvePerformanceStatus,
} from "@/lib/dashboard/department-performance";
import { cn } from "@/lib/utils";

const ANALYTICS_DEPTS_HREF = "/analytics?tab=organization";

interface PerformanceApiPayload extends DepartmentPerformanceMetrics {
	available: boolean;
	generatedAt: string;
}

interface PerformanceApiResponse {
	success: boolean;
	data?: PerformanceApiPayload;
	error?: string;
}

export type DepartmentPerformanceWidgetData = Pick<
	DepartmentPerformanceMetrics,
	| "averageProductivity"
	| "meetingTargetCount"
	| "totalStaffCount"
	| "trend"
	| "departmentsWithContracts"
	| "complianceTarget"
	| "status"
	| "trendDeltaPts"
> & {
	generatedAt?: string;
};

interface DepartmentPerformanceWidgetProps {
	/** Optional override; live fetch is skipped when provided (including null = loaded, unavailable). */
	data?: DepartmentPerformanceWidgetData | null;
}

const fetcher = async (url: string): Promise<PerformanceApiPayload> => {
	const response = await fetch(url);
	const json = (await response.json()) as PerformanceApiResponse;
	if (!response.ok || !json.success || !json.data?.available) {
		throw new Error(json.error || "Department performance unavailable");
	}
	return json.data;
};

type StatusTone = {
	/** Border tint on the outer card (cap stays neutral above the fill). */
	shell: string;
	/** Status wash — applied only to content below the glass-card-cap. */
	fill: string;
	divider: string;
	score: string;
	accentFill: string;
	accentTrack: string;
	badge: string;
	badgeText: string;
	sparkline: string;
	sparkFill: string;
	icon: LucideIcon;
	iconTone: "default" | "warning" | "danger" | "success";
};

function statusTone(status: PerformanceStatus): StatusTone {
	switch (status) {
		case "on_target":
			return {
				shell: "border-slate-200/80",
				fill: "",
				divider: "border-slate-200/80",
				score: "text-green",
				accentFill: "bg-green",
				accentTrack: "bg-slate-200",
				badge: "bg-green/10 border-green/20",
				badgeText: "text-green",
				sparkline: "#3dd9b3",
				sparkFill: "rgba(61, 217, 179, 0.22)",
				icon: TrendingUp,
				iconTone: "success",
			};
		case "near_target":
			return {
				shell: "border-orange/20",
				fill: "bg-orange/10",
				divider: "border-orange/20",
				score: "text-orange",
				accentFill: "bg-orange",
				accentTrack: "bg-orange/20",
				badge: "bg-orange/15 border-orange/25",
				badgeText: "text-orange",
				sparkline: "#ebc620",
				sparkFill: "rgba(235, 198, 32, 0.22)",
				icon: TrendingUp,
				iconTone: "warning",
			};
		case "below_target":
		default:
			return {
				shell: "border-red/20",
				fill: "bg-red/10",
				divider: "border-red/20",
				score: "text-red",
				accentFill: "bg-red",
				accentTrack: "bg-red/15",
				badge: "bg-red/10 border-red/20",
				badgeText: "text-red",
				sparkline: "#fe8787",
				sparkFill: "rgba(254, 135, 135, 0.22)",
				icon: TrendingDown,
				iconTone: "danger",
			};
	}
}

function formatRelativeUpdated(iso?: string): string {
	if (!iso) return "Updated just now";
	const ms = Date.now() - new Date(iso).getTime();
	if (!Number.isFinite(ms) || ms < 0) return "Updated just now";
	const mins = Math.floor(ms / 60_000);
	if (mins < 1) return "Updated just now";
	if (mins === 1) return "Updated 1 min ago";
	if (mins < 60) return `Updated ${mins} min ago`;
	const hours = Math.floor(mins / 60);
	if (hours === 1) return "Updated 1 hr ago";
	return `Updated ${hours} hr ago`;
}

function TrendSparkline({
	trend,
	stroke,
	fill,
}: {
	trend: PerformanceTrend;
	stroke: string;
	fill: string;
}) {
	const points =
		trend === "up"
			? [
					[0, 28],
					[20, 24],
					[40, 20],
					[60, 14],
					[80, 6],
					[100, 2],
				]
			: trend === "down"
				? [
						[0, 4],
						[20, 8],
						[40, 14],
						[60, 20],
						[80, 26],
						[100, 30],
					]
				: [
						[0, 16],
						[20, 15],
						[40, 17],
						[60, 15],
						[80, 16],
						[100, 15],
					];
	const line = points.map(([x, y]) => `${x},${y}`).join(" ");
	const area = `M${points.map(([x, y]) => `${x},${y}`).join(" L")} L100,34 L0,34 Z`;

	return (
		<svg
			viewBox="0 0 100 34"
			className="h-8 w-24"
			aria-hidden
			preserveAspectRatio="none"
		>
			<path d={area} fill={fill} />
			<polyline
				points={line}
				fill="none"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function TargetMeter({
	score,
	target,
	tone,
}: {
	score: number;
	target: number;
	tone: StatusTone;
}) {
	const scorePct = Math.max(0, Math.min(100, score));
	const targetPct = Math.max(0, Math.min(100, target));
	const delta = score - target;
	const deltaLabel =
		delta === 0
			? "At target"
			: delta > 0
				? `${delta} pts above target`
				: `${Math.abs(delta)} pts below target`;

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-[11px] text-slate-500">
				<span>0%</span>
				<span>
					Target <span className="font-semibold text-slate-700">{target}%</span>
				</span>
			</div>
			{/* py keeps the target tick visible; track itself stays clipped to a pill */}
			<div className="relative py-1">
				<div
					className={cn(
						"relative h-2 w-full overflow-hidden rounded-full",
						tone.accentTrack,
					)}
				>
					<div
						className={cn(
							"absolute inset-y-0 left-0 rounded-full transition-all duration-500",
							tone.accentFill,
						)}
						style={{ width: `${scorePct}%` }}
					/>
				</div>
				<div
					className="absolute top-1/2 z-[1] h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-slate-800"
					style={{ left: `calc(${targetPct}% - 1px)` }}
					aria-hidden
				/>
			</div>
			<p className={cn("text-xs font-medium", tone.score)}>{deltaLabel}</p>
		</div>
	);
}

const DepartmentPerformanceWidget: React.FC<
	DepartmentPerformanceWidgetProps
> = ({ data: propData }) => {
	const useLiveFetch = propData === undefined;

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

	useRealtime({
		collectionId: appwriteConfig.contractsCollectionId,
		enabled: useLiveFetch,
		onUpdate: onRealtimeUpdate,
	});

	useRealtime({
		collectionId: appwriteConfig.usersCollectionId,
		enabled: useLiveFetch,
		onUpdate: onRealtimeUpdate,
	});

	const performanceData =
		useMemo((): DepartmentPerformanceWidgetData | null => {
			const source = propData !== undefined ? propData : data;
			if (!source) return null;
			const complianceTarget =
				source.complianceTarget ?? DEPARTMENT_COMPLIANCE_TARGET;
			return {
				averageProductivity: source.averageProductivity,
				meetingTargetCount: source.meetingTargetCount,
				totalStaffCount: source.totalStaffCount,
				trend: source.trend,
				departmentsWithContracts:
					source.departmentsWithContracts ?? source.meetingTargetCount,
				complianceTarget,
				status:
					source.status ??
					resolvePerformanceStatus(
						source.averageProductivity,
						complianceTarget,
					),
				trendDeltaPts: source.trendDeltaPts ?? 0,
				generatedAt:
					"generatedAt" in source
						? (source as PerformanceApiPayload).generatedAt
						: source.generatedAt,
			};
		}, [propData, data]);

	const analyticsUnavailable = useLiveFetch && Boolean(error);
	const isLive = Boolean(performanceData) && !analyticsUnavailable;

	if (useLiveFetch && isLoading && !performanceData) {
		return (
			<Card className="glass-card w-full min-h-[280px] overflow-hidden">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-5">
					<div className="flex h-48 items-center justify-center">
						<div className="flex flex-col items-center gap-3">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
							<p className="text-xs font-medium text-slate-500">
								Loading metrics…
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!performanceData || analyticsUnavailable) {
		return (
			<Card className="glass-card w-full min-h-[280px] overflow-hidden">
				<div className="glass-card-cap" />
				<CardContent className="flex flex-col items-center justify-center gap-3 p-4 sm:p-5">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10">
						<TrendingDown className="h-5 w-5 text-red" />
					</div>
					<div className="text-center">
						<p className="text-sm font-medium text-slate-700">
							Data unavailable
						</p>
						<p className="text-xs text-slate-500">
							Analytics or database is not available
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const target =
		performanceData.complianceTarget ?? DEPARTMENT_COMPLIANCE_TARGET;
	const status = performanceData.status;
	const tone = statusTone(status);
	const deptTotal = Math.max(
		performanceData.departmentsWithContracts,
		performanceData.meetingTargetCount,
	);
	const deptRatio =
		deptTotal > 0 ? (performanceData.meetingTargetCount / deptTotal) * 100 : 0;
	const pts = Math.abs(performanceData.trendDeltaPts);
	const trendUp = performanceData.trend === "up";
	const trendDown = performanceData.trend === "down";

	return (
		<div
			className={cn(
				"glass-card relative flex h-full w-full flex-col overflow-hidden transition-all duration-200",
				tone.shell,
			)}
		>
			<div className="glass-card-cap" />
			{/* Status fill starts under the cap so the gray bar stays neutral */}
			<div
				className={cn(
					"relative z-10 flex min-h-0 flex-1 flex-col gap-2 p-3 pb-7",
					tone.fill,
				)}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-start gap-2.5">
						<StatCardIcon icon={tone.icon} tone={tone.iconTone} />
						<div className="min-w-0">
							<p className="text-sm font-semibold text-slate-800">
								Department performance
							</p>
							<p className="text-xs text-slate-600">
								Org-wide, all departments
							</p>
						</div>
					</div>
					<Link
						href={ANALYTICS_DEPTS_HREF}
						aria-label="Open department analytics"
						className="shrink-0 rounded-md p-1 text-[#0f5384] transition-colors duration-200 hover:bg-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					>
						<SquareArrowOutUpRight className="h-4 w-4" aria-hidden />
					</Link>
				</div>

				<div className="flex items-start justify-between gap-3">
					<div>
						<p
							className={cn(
								"text-xl font-bold tabular-nums tracking-tight",
								tone.score,
							)}
						>
							{performanceData.averageProductivity}%
						</p>
						<p className="text-xs text-slate-600">Average score</p>
					</div>
					<div className="flex flex-col items-end gap-0.5">
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
								tone.badge,
								tone.badgeText,
							)}
						>
							<Triangle
								className={cn(
									"h-2.5 w-2.5 fill-current",
									trendDown && "rotate-180",
									!trendUp && !trendDown && "opacity-40",
								)}
								aria-hidden
							/>
							{pts} pts
						</span>
						<TrendSparkline
							trend={performanceData.trend}
							stroke={tone.sparkline}
							fill={tone.sparkFill}
						/>
						<p className="text-[10px] text-slate-500">vs last week</p>
					</div>
				</div>

				<TargetMeter
					score={performanceData.averageProductivity}
					target={target}
					tone={tone}
				/>

				<div
					className={cn(
						"space-y-1.5 rounded-lg border bg-white/50 p-2.5",
						tone.divider,
					)}
				>
					<div className="flex items-center justify-between gap-3">
						<p className="text-[11px] text-slate-500">Departments at target</p>
						<p className="text-sm font-bold tabular-nums text-slate-800">
							{performanceData.meetingTargetCount}
							<span className="font-medium text-slate-600">
								{" "}
								of {deptTotal}
							</span>
						</p>
					</div>
					<div
						className={cn(
							"h-1.5 w-full overflow-hidden rounded-full",
							tone.accentTrack,
						)}
					>
						<div
							className={cn("h-full rounded-full", tone.accentFill)}
							style={{ width: `${deptRatio}%` }}
						/>
					</div>
				</div>
			</div>

			{/* Overlayed so carousel height stays locked to sibling widgets */}
			<div className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
				<span
					className={cn(
						"h-1.5 w-1.5 shrink-0 rounded-full",
						isLive ? "bg-green animate-pulse" : "bg-red",
					)}
					aria-hidden
				/>
				<span className="text-[12px] font-medium text-slate-500">
					{formatRelativeUpdated(performanceData.generatedAt)}
				</span>
			</div>
		</div>
	);
};

export default DepartmentPerformanceWidget;
