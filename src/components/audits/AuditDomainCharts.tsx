"use client";

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
	CaalmAnalyticsChartShell,
} from "@/components/charts/CaalmAnalyticsChartShell";
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

const timeChartConfig = {
	value: { label: "Primary", color: CAALM_CHART_COLORS.primary },
	secondary: { label: "Secondary", color: "#94a3b8" },
} satisfies ChartConfig;

const breakdownChartConfig = {
	value: { label: "Count", color: CAALM_CHART_COLORS.primary },
} satisfies ChartConfig;

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
	const pieConfig = donut.reduce((acc, item, index) => {
		acc[item.name] = {
			label: item.name,
			color:
				item.fill ||
				CAALM_CHART_COLORS.donut[index % CAALM_CHART_COLORS.donut.length],
		};
		return acc;
	}, {} as ChartConfig);

	const hasSecondary = timeSeries.some(
		(point) => typeof point.secondary === "number",
	);

	return (
		<div className="mb-6 space-y-6">
			<CaalmAnalyticsChartShell
				title={timeSeriesTitle}
				subtitle="Hover data points for detailed CAALM audit values"
			>
				<ChartContainer
					config={timeChartConfig}
					className="h-[280px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-slate-400"
				>
					<AreaChart data={timeSeries} margin={{ left: 8, right: 8, top: 8 }}>
						<defs>
							<linearGradient
								id="auditDomainPrimary"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									stopColor={CAALM_CHART_COLORS.primary}
									stopOpacity={0.4}
								/>
								<stop
									offset="100%"
									stopColor={CAALM_CHART_COLORS.primary}
									stopOpacity={0}
								/>
							</linearGradient>
							<linearGradient
								id="auditDomainSecondary"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
								<stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid
							vertical={false}
							strokeDasharray="3 3"
							stroke={CAALM_CHART_COLORS.grid}
						/>
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tick={{ fill: CAALM_CHART_COLORS.axis, fontSize: 11 }}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							width={32}
							tick={{ fill: CAALM_CHART_COLORS.axis, fontSize: 11 }}
						/>
						<ChartTooltip
							cursor={{
								stroke: CAALM_CHART_COLORS.primary,
								strokeOpacity: 0.35,
							}}
							content={<ChartTooltipContent indicator="line" />}
						/>
						{hasSecondary && (
							<ChartLegend
								content={<ChartLegendContent className="text-slate-400" />}
							/>
						)}
						<Area
							type="monotone"
							dataKey="value"
							stroke={CAALM_CHART_COLORS.primary}
							fill="url(#auditDomainPrimary)"
							strokeWidth={2.5}
							dot={false}
							activeDot={{
								r: 5,
								fill: CAALM_CHART_COLORS.primary,
								stroke: "#0f172a",
								strokeWidth: 2,
							}}
						/>
						{hasSecondary && (
							<Area
								type="monotone"
								dataKey="secondary"
								stroke="#94a3b8"
								fill="url(#auditDomainSecondary)"
								strokeWidth={2}
								dot={false}
							/>
						)}
					</AreaChart>
				</ChartContainer>
			</CaalmAnalyticsChartShell>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<CaalmAnalyticsChartShell title={breakdownTitle}>
					<ChartContainer
						config={breakdownChartConfig}
						className="h-[240px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-slate-400"
					>
						<BarChart data={breakdown} margin={{ left: 8, right: 8 }}>
							<CartesianGrid
								vertical={false}
								strokeDasharray="3 3"
								stroke={CAALM_CHART_COLORS.grid}
							/>
							<XAxis
								dataKey="name"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tick={{ fill: CAALM_CHART_COLORS.axis, fontSize: 11 }}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={32}
								tick={{ fill: CAALM_CHART_COLORS.axis, fontSize: 11 }}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="value" radius={[4, 4, 0, 0]}>
								{breakdown.map((entry, index) => (
									<Cell
										key={entry.name}
										fill={
											entry.fill ||
											CAALM_CHART_COLORS.donut[
												index % CAALM_CHART_COLORS.donut.length
											]
										}
										className="cursor-pointer"
									/>
								))}
							</Bar>
						</BarChart>
					</ChartContainer>
				</CaalmAnalyticsChartShell>

				<CaalmAnalyticsChartShell title={donutTitle}>
					<ChartContainer
						config={pieConfig}
						className="h-[240px] w-full [&_.recharts-legend-item-text]:fill-slate-300"
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
											entry.fill ||
											CAALM_CHART_COLORS.donut[
												index % CAALM_CHART_COLORS.donut.length
											]
										}
										className="cursor-pointer"
									/>
								))}
							</Pie>
							<ChartLegend
								content={<ChartLegendContent className="text-slate-400" />}
							/>
						</PieChart>
					</ChartContainer>
				</CaalmAnalyticsChartShell>
			</div>
		</div>
	);
}
