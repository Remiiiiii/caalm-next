"use client";

import { useId, useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import {
	CAALM_CHART_COLORS,
	CAALM_CHART_COLORS_LIGHT,
	CaalmAnalyticsChartShell,
} from "@/components/charts/CaalmAnalyticsChartShell";
import {
	type ChartTone,
	ChartToneSwitch,
} from "@/components/charts/ChartToneSwitch";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type {
	AuditBreakdownPoint,
	AuditTimeSeriesPoint,
} from "@/lib/audits/types";
import { cn } from "@/lib/utils";

interface AuditDomainChartsProps {
	timeSeries: AuditTimeSeriesPoint[];
	breakdown: AuditBreakdownPoint[];
	donut: AuditBreakdownPoint[];
	timeSeriesTitle: string;
	breakdownTitle: string;
	donutTitle: string;
}

export function AuditDomainCharts({
	timeSeries,
	breakdown,
	donut,
	timeSeriesTitle,
	breakdownTitle,
	donutTitle,
}: AuditDomainChartsProps) {
	const [tone, setTone] = useState<ChartTone>("dark");
	const isLight = tone === "light";
	const colors = isLight ? CAALM_CHART_COLORS_LIGHT : CAALM_CHART_COLORS;
	const secondaryStroke = isLight ? "#64748b" : "#94a3b8";
	const activeDotStroke = isLight ? "#ffffff" : "#0f172a";
	const legendClass = isLight ? "text-slate-600" : "text-slate-400";
	const axisTickClass = isLight
		? "[&_.recharts-cartesian-axis-tick_text]:fill-slate-600"
		: "[&_.recharts-cartesian-axis-tick_text]:fill-slate-400";
	const legendItemClass = isLight
		? "[&_.recharts-legend-item-text]:fill-slate-700"
		: "[&_.recharts-legend-item-text]:fill-slate-300";

	const gradientSuffix = useId().replace(/:/g, "");

	const timeChartConfig = useMemo(
		() =>
			({
				value: { label: "Primary", color: colors.primary },
				secondary: { label: "Secondary", color: secondaryStroke },
			}) satisfies ChartConfig,
		[colors.primary, secondaryStroke],
	);

	const breakdownChartConfig = useMemo(
		() =>
			({
				value: { label: "Count", color: colors.primary },
			}) satisfies ChartConfig,
		[colors.primary],
	);

	const pieConfig = useMemo(
		() =>
			donut.reduce((acc, item, index) => {
				acc[item.name] = {
					label: item.name,
					color: item.fill || colors.donut[index % colors.donut.length],
				};
				return acc;
			}, {} as ChartConfig),
		[donut, colors.donut],
	);

	const hasSecondary = timeSeries.some(
		(point) => typeof point.secondary === "number",
	);

	return (
		<div className="mb-6 space-y-6">
			<CaalmAnalyticsChartShell
				title={timeSeriesTitle}
				subtitle="Hover data points for detailed CAALM audit values"
				panelTone={tone}
				headerAction={<ChartToneSwitch tone={tone} onChange={setTone} />}
			>
				<ChartContainer
					config={timeChartConfig}
					className={cn("h-[280px] w-full", axisTickClass)}
				>
					<AreaChart data={timeSeries} margin={{ left: 8, right: 8, top: 8 }}>
						<defs>
							<linearGradient
								id={`auditDomainPrimary-${gradientSuffix}`}
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									stopColor={colors.primary}
									stopOpacity={isLight ? 0.32 : 0.4}
								/>
								<stop
									offset="100%"
									stopColor={colors.primary}
									stopOpacity={0}
								/>
							</linearGradient>
							<linearGradient
								id={`auditDomainSecondary-${gradientSuffix}`}
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									stopColor={secondaryStroke}
									stopOpacity={isLight ? 0.2 : 0.25}
								/>
								<stop
									offset="100%"
									stopColor={secondaryStroke}
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							vertical={false}
							strokeDasharray="3 3"
							stroke={colors.grid}
						/>
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tick={{ fill: colors.axis, fontSize: 11 }}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							width={32}
							tick={{ fill: colors.axis, fontSize: 11 }}
						/>
						<ChartTooltip
							cursor={{
								stroke: colors.primary,
								strokeOpacity: 0.35,
							}}
							content={<ChartTooltipContent indicator="line" />}
						/>
						{hasSecondary && (
							<ChartLegend
								content={<ChartLegendContent className={legendClass} />}
							/>
						)}
						<Area
							type="monotone"
							dataKey="value"
							stroke={colors.primary}
							fill={`url(#auditDomainPrimary-${gradientSuffix})`}
							strokeWidth={2.5}
							dot={false}
							activeDot={{
								r: 5,
								fill: colors.primary,
								stroke: activeDotStroke,
								strokeWidth: 2,
							}}
						/>
						{hasSecondary && (
							<Area
								type="monotone"
								dataKey="secondary"
								stroke={secondaryStroke}
								fill={`url(#auditDomainSecondary-${gradientSuffix})`}
								strokeWidth={2}
								dot={false}
							/>
						)}
					</AreaChart>
				</ChartContainer>
			</CaalmAnalyticsChartShell>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<CaalmAnalyticsChartShell title={breakdownTitle} panelTone={tone}>
					<ChartContainer
						config={breakdownChartConfig}
						className={cn("h-[240px] w-full", axisTickClass)}
					>
						<BarChart data={breakdown} margin={{ left: 8, right: 8 }}>
							<CartesianGrid
								vertical={false}
								strokeDasharray="3 3"
								stroke={colors.grid}
							/>
							<XAxis
								dataKey="name"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tick={{ fill: colors.axis, fontSize: 11 }}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={32}
								tick={{ fill: colors.axis, fontSize: 11 }}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="value" radius={[4, 4, 0, 0]}>
								{breakdown.map((entry, index) => (
									<Cell
										key={entry.name}
										fill={
											entry.fill || colors.donut[index % colors.donut.length]
										}
										className="cursor-pointer"
									/>
								))}
							</Bar>
						</BarChart>
					</ChartContainer>
				</CaalmAnalyticsChartShell>

				<CaalmAnalyticsChartShell title={donutTitle} panelTone={tone}>
					<ChartContainer
						config={pieConfig}
						className={cn("h-[240px] w-full", legendItemClass)}
					>
						<PieChart>
							<ChartTooltip content={<ChartTooltipContent hideLabel />} />
							<Pie
								data={donut}
								dataKey="value"
								nameKey="name"
								innerRadius={56}
								outerRadius={88}
								paddingAngle={3}
								strokeWidth={0}
							>
								{donut.map((entry, index) => (
									<Cell
										key={entry.name}
										fill={
											entry.fill || colors.donut[index % colors.donut.length]
										}
										className="cursor-pointer"
									/>
								))}
							</Pie>
							<ChartLegend
								content={<ChartLegendContent className={legendClass} />}
							/>
						</PieChart>
					</ChartContainer>
				</CaalmAnalyticsChartShell>
			</div>
		</div>
	);
}
