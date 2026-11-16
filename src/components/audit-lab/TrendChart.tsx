"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	CAALM_CHART_COLORS,
	CaalmAnalyticsChartShell,
} from "@/components/charts/CaalmAnalyticsChartShell";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

export function TrendChart({
	series,
}: {
	series: Array<{
		label: string;
		readiness: number;
		practice: number;
	}>;
}) {
	const colors = CAALM_CHART_COLORS;
	return (
		<CaalmAnalyticsChartShell title="Readiness vs practice (trailing)">
			<ChartContainer
				config={{
					readiness: { label: "Readiness", color: colors.primary },
					practice: { label: "Practice", color: colors.secondary },
				}}
				className="h-[240px] w-full"
			>
				<AreaChart data={series} margin={{ left: 8, right: 8, top: 8 }}>
					<CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.grid} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={false}
						tick={{ fill: colors.axis, fontSize: 11 }}
					/>
					<YAxis
						domain={[0, 100]}
						tickLine={false}
						axisLine={false}
						width={32}
						tick={{ fill: colors.axis, fontSize: 11 }}
					/>
					<ChartTooltip content={<ChartTooltipContent />} />
					<ChartLegend content={<ChartLegendContent />} />
					<Area
						type="monotone"
						dataKey="readiness"
						stroke={colors.primary}
						fill={colors.primary}
						fillOpacity={0.15}
					/>
					<Area
						type="monotone"
						dataKey="practice"
						stroke={colors.secondary}
						fill={colors.secondary}
						fillOpacity={0.12}
					/>
				</AreaChart>
			</ChartContainer>
		</CaalmAnalyticsChartShell>
	);
}