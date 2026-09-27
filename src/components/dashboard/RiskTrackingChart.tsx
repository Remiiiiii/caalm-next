"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	rollupTrackingMonths,
	type TrackingGrain,
} from "@/lib/dashboard/risk-impact-sparkline";
import type { RiskImpactSparkPoint } from "@/lib/dashboard/risk-impact.types";

interface RiskTrackingChartProps {
	points: RiskImpactSparkPoint[];
	period?: "ytd" | "last30" | "last90";
	title?: string;
	children?: ReactNode;
}

function formatTooltipDate(
	point: RiskImpactSparkPoint,
	grain: TrackingGrain,
	period: "ytd" | "last30" | "last90",
) {
	if (!point.date) return point.label;
	const [year, month, day] = point.date.split("-").map(Number);
	const date = new Date(year, (month || 1) - 1, day || 1);
	if (grain === "month") {
		return date.toLocaleString("en-US", { month: "long", year: "numeric" });
	}
	if (period === "last30") {
		return date.toLocaleString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}
	return `Week of ${date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})}`;
}

/** Every month in the plotted range, plus spaced day ticks for last-30. */
function axisTicks(
	series: RiskImpactSparkPoint[],
	grain: TrackingGrain,
	period: "ytd" | "last30" | "last90",
): string[] {
	if (grain === "month") return series.map((point) => point.label);
	if (period === "last30") {
		return series
			.filter(
				(_, index) =>
					index === 0 ||
					index === series.length - 1 ||
					index % 7 === 0,
			)
			.map((point) => point.label);
	}
	const seen = new Set<string>();
	const monthStarts = series.filter((point) => {
		const month = point.month || "";
		if (!month || seen.has(month)) return false;
		seen.add(month);
		return true;
	});
	// Drop the leftover December week created by Monday-start YTD buckets.
	const hasJanuary = monthStarts.some((point) => point.month === "JAN");
	return monthStarts
		.filter((point) => !(hasJanuary && point.month === "DEC"))
		.map((point) => point.label);
}

export function RiskTrackingChart({
	points,
	period = "ytd",
	title = "Tracking status",
	children,
}: RiskTrackingChartProps) {
	const showGrainToggle = period !== "last30";
	const [grain, setGrain] = useState<TrackingGrain>("week");
	const [expanded, setExpanded] = useState(true);

	const series = useMemo(() => {
		if (grain === "month") return rollupTrackingMonths(points);
		return points;
	}, [grain, points]);

	const plotRef = useRef<HTMLDivElement>(null);
	const [plotWidth, setPlotWidth] = useState(0);

	const ticks = useMemo(
		() => axisTicks(series, grain, period),
		[grain, period, series],
	);

	const last = series[series.length - 1];
	const totalEvents = last?.value ?? 0;
	const peakActivity = Math.max(
		1,
		...series.map((point) => point.increment ?? 0),
	);
	const yUnit =
		grain === "month" ? "month" : period === "last30" ? "day" : "week";
	const yAxisTitle = `New events / ${yUnit}`;

	useEffect(() => {
		const el = plotRef.current;
		if (!el) return;
		const syncWidth = () => setPlotWidth(Math.floor(el.clientWidth));
		syncWidth();
		const observer = new ResizeObserver(syncWidth);
		observer.observe(el);
		return () => observer.disconnect();
	}, [expanded]);

	const tickByLabel = useMemo(() => {
		const map = new Map<string, string>();
		for (const point of series) {
			map.set(point.label, point.month || point.label);
		}
		return map;
	}, [series]);

	return (
		<div className="w-full min-w-0">
			<div className="mb-2 flex items-center justify-between gap-3">
				<button
					type="button"
					aria-expanded={expanded}
					aria-controls="risk-tracking-panel"
					onClick={() => setExpanded((open) => !open)}
					className="flex cursor-pointer items-center gap-2 rounded-md text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					<p className="text-[11px] font-bold tracking-[0.08em] uppercase text-slate-700">
						{title}
					</p>
					<ChevronDown
						className={`h-4 w-4 shrink-0 text-[#0f5384] transition-transform duration-200 ${
							expanded ? "" : "-rotate-90"
						}`}
						aria-hidden
					/>
				</button>
				{expanded && showGrainToggle ? (
					<SegmentedToggle
						value={grain}
						onChange={setGrain}
						ariaLabel="Chart time grain"
						tabs={[
							{ value: "week", label: "Week" },
							{ value: "month", label: "Month" },
						]}
					/>
				) : expanded ? (
					<p className="text-[11px] text-slate-500">Daily</p>
				) : null}
			</div>

			{expanded ? (
				<div id="risk-tracking-panel">
					<p className="mb-1 text-[10px] font-medium text-slate-500">
						{yAxisTitle}
					</p>
					<div
						ref={plotRef}
						className="relative h-44 w-full min-w-0 outline-none **:outline-none"
					>
						{plotWidth > 0 ? (
							<AreaChart
								width={plotWidth}
								height={176}
								data={series}
								margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
								style={{ outline: "none" }}
							>
								<defs>
									<linearGradient
										id="riskTrackFill"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="0%" stopColor="#03AFBF" stopOpacity={0.28} />
										<stop
											offset="100%"
											stopColor="#0f5384"
											stopOpacity={0.02}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#e2e8f0"
									vertical={false}
								/>
								<XAxis
									dataKey="label"
									ticks={ticks}
									interval={0}
									tickFormatter={(label: string) =>
										grain === "week" && period !== "last30"
											? (tickByLabel.get(label) ?? label)
											: label
									}
									tick={{ fill: "#64748b", fontSize: 10 }}
									tickLine={false}
									axisLine={{ stroke: "#cbd5e1" }}
									minTickGap={8}
									height={22}
								/>
								<YAxis
									allowDecimals={false}
									width={24}
									tickCount={3}
									tick={{ fill: "#64748b", fontSize: 10 }}
									tickLine={false}
									axisLine={false}
									domain={[0, peakActivity]}
								/>
								<Tooltip
									cursor={{ stroke: "#0f5384", strokeDasharray: "3 3" }}
									content={({ active, payload }) => {
										if (!active || !payload?.[0]) return null;
										const point = payload[0]
											.payload as RiskImpactSparkPoint;
										const increment = point.increment ?? 0;
										return (
											<div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md">
												<p className="text-xs font-medium text-slate-700">
													{formatTooltipDate(point, grain, period)}
												</p>
												<p className="mt-1 text-xs tabular-nums text-slate-600">
													<span className="font-semibold text-slate-800">
														{increment}
													</span>{" "}
													new event{increment === 1 ? "" : "s"}
												</p>
												<p className="text-xs tabular-nums text-slate-600">
													<span className="font-semibold text-slate-800">
														{point.value}
													</span>{" "}
													cumulative
												</p>
											</div>
										);
									}}
								/>
								<Area
									type="monotone"
									dataKey="increment"
									stroke="#0f5384"
									strokeWidth={2}
									fill="url(#riskTrackFill)"
									dot={false}
									activeDot={{
										r: 5,
										fill: "rgba(255, 255, 255, 0.55)",
										stroke: "#0f5384",
										strokeWidth: 2,
									}}
									isAnimationActive={false}
								/>
							</AreaChart>
						) : null}
					</div>

					<p className="mt-1 text-[11px] text-slate-500 tabular-nums">
						Y-axis is new events per {yUnit}, not dollars. {totalEvents}{" "}
						event{totalEvents === 1 ? "" : "s"} plotted.
					</p>
					{children}
				</div>
			) : null}
		</div>
	);
}
