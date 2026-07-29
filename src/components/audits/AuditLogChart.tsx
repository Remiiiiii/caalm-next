"use client";

import { format } from "date-fns";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	CAALM_CHART_COLORS,
	CaalmAnalyticsChartShell,
	darkChartTooltipStyle,
} from "@/components/charts/CaalmAnalyticsChartShell";

interface AuditLogChartProps {
	data?: Array<{ date: string; count: number }>;
	isLoading?: boolean;
}

export function AuditLogChart({ data, isLoading }: AuditLogChartProps) {
	const chartData = (data || []).map((point) => ({
		...point,
		label: format(new Date(`${point.date}T00:00:00`), "MMM d"),
	}));

	const total = chartData.reduce((sum, point) => sum + (point.count || 0), 0);

	return (
		<CaalmAnalyticsChartShell
			className="mb-6"
			title="Event volume (last 30 days)"
			subtitle={
				chartData.length > 0
					? `${total.toLocaleString()} audit events across the selected window`
					: "Daily audit event counts for your organization"
			}
		>
			{isLoading ? (
				<div className="h-48 w-full animate-pulse rounded-lg bg-slate-800/60" />
			) : chartData.length === 0 ? (
				<div className="flex h-48 items-center justify-center text-sm text-slate-400">
					No event volume data for this period.
				</div>
			) : (
				<div className="h-48 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
							<defs>
								<linearGradient id="auditVolumeFill" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="0%"
										stopColor={CAALM_CHART_COLORS.primary}
										stopOpacity={0.45}
									/>
									<stop
										offset="100%"
										stopColor={CAALM_CHART_COLORS.primary}
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke={CAALM_CHART_COLORS.grid}
								vertical={false}
							/>
							<XAxis
								dataKey="label"
								tick={{ fill: CAALM_CHART_COLORS.axis, fontSize: 11 }}
								axisLine={false}
								tickLine={false}
							/>
							<YAxis
								allowDecimals={false}
								tick={{ fill: CAALM_CHART_COLORS.axis, fontSize: 11 }}
								axisLine={false}
								tickLine={false}
								width={28}
							/>
							<Tooltip
								contentStyle={darkChartTooltipStyle}
								labelStyle={{ color: "#f8fafc" }}
								itemStyle={{ color: CAALM_CHART_COLORS.primary }}
								formatter={(value) => [
									`${Number(value || 0).toLocaleString()} events`,
									"Volume",
								]}
							/>
							<Area
								type="monotone"
								dataKey="count"
								stroke={CAALM_CHART_COLORS.primary}
								strokeWidth={2.5}
								fill="url(#auditVolumeFill)"
								dot={false}
								activeDot={{
									r: 5,
									fill: CAALM_CHART_COLORS.primary,
									stroke: "#0f172a",
									strokeWidth: 2,
								}}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			)}
		</CaalmAnalyticsChartShell>
	);
}
