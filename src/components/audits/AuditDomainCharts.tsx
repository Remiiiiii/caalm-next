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
import { Card, CardContent } from "@/components/ui/card";
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
	value: { label: "Primary", color: "#0f5384" },
	secondary: { label: "Secondary", color: "#03AFBF" },
} satisfies ChartConfig;

const breakdownChartConfig = {
	value: { label: "Count", color: "#0f5384" },
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
				item.fill || ["#0f5384", "#03AFBF", "#56B8FF", "#1E40AF"][index % 4],
		};
		return acc;
	}, {} as ChartConfig);

	return (
		<div className="space-y-6 mb-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<h3 className="text-sm font-medium sidebar-gradient-text mb-1">
						{timeSeriesTitle}
					</h3>
					<p className="text-xs text-slate-600 mb-4">
						Hover data points for detailed values
					</p>
					<ChartContainer config={timeChartConfig} className="h-[280px] w-full">
						<AreaChart data={timeSeries} margin={{ left: 8, right: 8, top: 8 }}>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
							/>
							<YAxis tickLine={false} axisLine={false} width={32} />
							<ChartTooltip
								cursor={{ stroke: "#0f5384", strokeOpacity: 0.2 }}
								content={<ChartTooltipContent indicator="line" />}
							/>
							<ChartLegend content={<ChartLegendContent />} />
							<Area
								type="monotone"
								dataKey="value"
								stroke="var(--color-value)"
								fill="var(--color-value)"
								fillOpacity={0.15}
								strokeWidth={2}
							/>
							<Area
								type="monotone"
								dataKey="secondary"
								stroke="var(--color-secondary)"
								fill="var(--color-secondary)"
								fillOpacity={0.1}
								strokeWidth={2}
							/>
						</AreaChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<h3 className="text-sm font-medium sidebar-gradient-text mb-4">
							{breakdownTitle}
						</h3>
						<ChartContainer
							config={breakdownChartConfig}
							className="h-[240px] w-full"
						>
							<BarChart data={breakdown} margin={{ left: 8, right: 8 }}>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="name"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
								/>
								<YAxis tickLine={false} axisLine={false} width={32} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="value" radius={[4, 4, 0, 0]}>
									{breakdown.map((entry) => (
										<Cell
											key={entry.name}
											fill={entry.fill || "#0f5384"}
											className="cursor-pointer"
										/>
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<h3 className="text-sm font-medium sidebar-gradient-text mb-4">
							{donutTitle}
						</h3>
						<ChartContainer config={pieConfig} className="h-[240px] w-full">
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={donut}
									dataKey="value"
									nameKey="name"
									innerRadius={56}
									outerRadius={88}
									paddingAngle={3}
									strokeWidth={2}
								>
									{donut.map((entry) => (
										<Cell
											key={entry.name}
											fill={entry.fill || "#0f5384"}
											className="cursor-pointer"
										/>
									))}
								</Pie>
								<ChartLegend content={<ChartLegendContent />} />
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
