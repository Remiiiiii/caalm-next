"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type {
	RiskImpactPeriod,
	RiskImpactSparkPoint,
} from "@/lib/dashboard/risk-impact.types";
import {
	padYearMonths,
	padYearWeeks,
	rollupTrackingMonths,
	type TrackingGrain,
} from "@/lib/dashboard/risk-impact-sparkline";

interface RiskTrackingChartProps {
	points: RiskImpactSparkPoint[];
	period?: RiskImpactPeriod;
	title?: string;
	children?: ReactNode;
}

/** X labels where the series crosses into a new calendar quarter (Q1–Q4). */
function quarterSeparatorLabels(series: RiskImpactSparkPoint[]): string[] {
	const labels: string[] = [];
	let prevQuarterKey: string | null = null;

	for (const point of series) {
		if (!point.date) continue;
		const [year, month] = point.date.split("-").map(Number);
		if (!year || !month) continue;
		// Business quarters: Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec
		const quarterKey = `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
		if (prevQuarterKey !== null && quarterKey !== prevQuarterKey) {
			labels.push(point.label);
		}
		prevQuarterKey = quarterKey;
	}

	return labels;
}

function formatTooltipDate(
	point: RiskImpactSparkPoint,
	grain: TrackingGrain,
	period: RiskImpactPeriod,
) {
	if (!point.date) return point.label;
	const [year, month, day] = point.date.split("-").map(Number);
	const date = new Date(year, (month || 1) - 1, day || 1);
	if (grain === "month") {
		return date.toLocaleString("en-US", { month: "long", year: "numeric" });
	}
	if (period === "last30" || period === "month") {
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
	period: RiskImpactPeriod,
): string[] {
	if (grain === "month") return series.map((point) => point.label);
	if (period === "last30" || period === "month") {
		return series
			.filter(
				(_, index) =>
					index === 0 || index === series.length - 1 || index % 7 === 0,
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
	// Drop a leading December left over from Monday-start weeks that begin in the prior year.
	const januaryIndex = monthStarts.findIndex((point) => point.month === "JAN");
	return monthStarts
		.filter((point, index) => {
			if (point.month !== "DEC" || januaryIndex < 0) return true;
			return index > januaryIndex;
		})
		.map((point) => point.label);
}

function chartYear(
	points: RiskImpactSparkPoint[],
	period: RiskImpactPeriod,
): number {
	if (period === "ytd") return new Date().getFullYear();
	for (const point of points) {
		if (point.date && /^\d{4}/.test(point.date)) {
			return Number(point.date.slice(0, 4));
		}
	}
	return new Date().getFullYear();
}

export function RiskTrackingChart({
	points,
	period = "ytd",
	title = "Tracking status",
	children,
}: RiskTrackingChartProps) {
	const showGrainToggle =
		period === "ytd" || period === "quarter" || period === "last90";
	const [grain, setGrain] = useState<TrackingGrain>(
		period === "ytd" ? "month" : "week",
	);
	const [expanded, setExpanded] = useState(true);
	const year = chartYear(points, period);

	const series = useMemo(() => {
		if (grain === "month") {
			return period === "ytd"
				? padYearMonths(points, year)
				: rollupTrackingMonths(points);
		}
		// Week grain for the year view also spans JAN–DEC (no horizontal scroll).
		if (period === "ytd") {
			return padYearWeeks(points, year);
		}
		return points;
	}, [grain, period, points, year]);

	const ticks = useMemo(
		() => axisTicks(series, grain, period),
		[grain, period, series],
	);

	const quarterLines = useMemo(() => quarterSeparatorLabels(series), [series]);

	const last = series[series.length - 1];
	const totalEvents = last?.value ?? 0;
	const peakActivity = Math.max(
		1,
		...series.map((point) => point.increment ?? 0),
	);
	const yUnit =
		grain === "month"
			? "month"
			: period === "last30" || period === "month"
				? "day"
				: "week";
	const yAxisTitle = `New events / ${yUnit}`;

	const tickByLabel = useMemo(() => {
		const map = new Map<string, string>();
		for (const point of series) {
			map.set(point.label, point.month || point.label);
		}
		return map;
	}, [series]);

	return (
		<div className="w-full min-w-0">
			<div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<button
					type="button"
					aria-expanded={expanded}
					aria-controls="risk-tracking-panel"
					onClick={() => setExpanded((open) => !open)}
					className="flex cursor-pointer items-center gap-2 justify-self-start rounded-md text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
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
				{expanded ? (
					<p className="justify-self-center text-lg font-bold tabular-nums text-[#105888]">
						{year}
					</p>
				) : (
					<span />
				)}
				<div className="justify-self-end">
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
						<p className="text-[11px] text-slate-500">
							{period === "month" ? "Daily" : "Week"}
						</p>
					) : null}
				</div>
			</div>

			{expanded ? (
				<div id="risk-tracking-panel">
					<p className="mb-1 text-[10px] font-medium text-slate-500">
						{yAxisTitle}
					</p>
					<div className="relative h-44 w-full min-w-0 overflow-hidden outline-none **:outline-none">
						<ResponsiveContainer width="100%" height={176}>
							<AreaChart
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
								{quarterLines.map((label) => (
									<ReferenceLine
										key={`q-${label}`}
										x={label}
										stroke="#94a3b8"
										strokeDasharray="4 4"
										strokeWidth={1}
										ifOverflow="extendDomain"
									/>
								))}
								<XAxis
									dataKey="label"
									ticks={ticks}
									interval={0}
									tickFormatter={(label: string) =>
										grain === "week" &&
										period !== "last30" &&
										period !== "month"
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
									cursor={{
										stroke: "#0f5384",
										strokeDasharray: "3 3",
									}}
									content={({ active, payload }) => {
										if (!active || !payload?.[0]) return null;
										const point = payload[0].payload as RiskImpactSparkPoint;
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
						</ResponsiveContainer>
					</div>

					<p className="mt-1 text-[11px] text-slate-500 tabular-nums">
						Y-axis is new events per {yUnit}, not dollars. {totalEvents} event
						{totalEvents === 1 ? "" : "s"} plotted.
					</p>
					{children}
				</div>
			) : null}
		</div>
	);
}
