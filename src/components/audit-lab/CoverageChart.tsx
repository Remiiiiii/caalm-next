"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	CAALM_CHART_COLORS,
	CaalmAnalyticsChartShell,
} from "@/components/charts/CaalmAnalyticsChartShell";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

export function CoverageChart({
	byDepartment,
}: {
	byDepartment: Array<{ name: string; acceptedPct: number }>;
}) {
	const colors = CAALM_CHART_COLORS;
	return (
		<CaalmAnalyticsChartShell title="Evidence accepted by department">
			<ChartContainer
				config={{
					acceptedPct: { label: "Accepted %", color: colors.primary },
				}}
				className="h-[220px] w-full"
			>
				<BarChart data={byDepartment} margin={{ left: 8, right: 8, top: 8 }}>
					<CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.grid} />
					<XAxis
						dataKey="name"
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
					<Bar dataKey="acceptedPct" fill={colors.primary} radius={[4, 4, 0, 0]} />
				</BarChart>
			</ChartContainer>
		</CaalmAnalyticsChartShell>
	);
}