"use client";

import { format } from "date-fns";
import { useId, useState } from "react";
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
	CAALM_CHART_COLORS_LIGHT,
	CaalmAnalyticsChartShell,
	darkChartTooltipStyle,
	lightChartTooltipStyle,
} from "@/components/charts/CaalmAnalyticsChartShell";
import {
	type ChartTone,
	ChartToneSwitch,
} from "@/components/charts/ChartToneSwitch";
import { cn } from "@/lib/utils";

interface AuditLogChartProps {
	data?: Array<{ date: string; count: number }>;
	isLoading?: boolean;
}

export function AuditLogChart({ data, isLoading }: AuditLogChartProps) {
	const [tone, setTone] = useState<ChartTone>("dark");
	const gradientId = useId().replace(/:/g, "");
	const isLight = tone === "light";
	const colors = isLight ? CAALM_CHART_COLORS_LIGHT : CAALM_CHART_COLORS;
	const tooltipStyle = isLight ? lightChartTooltipStyle : darkChartTooltipStyle;

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
			panelTone={tone}
			headerAction={<ChartToneSwitch tone={tone} onChange={setTone} />}
		>
			{isLoading ? (
				<div
					className={cn(
						"h-48 w-full animate-pulse rounded-lg",
						isLight ? "bg-slate-200/70" : "bg-slate-800/60",
					)}
				/>
			) : chartData.length === 0 ? (
				<div
					className={cn(
						"flex h-48 items-center justify-center text-sm",
						isLight ? "text-slate-500" : "text-slate-400",
					)}
				>
					No event volume data for this period.
				</div>
			) : (
				<div className="h-48 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
							<defs>
								<linearGradient
									id={`auditVolumeFill-${gradientId}`}
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor={colors.primary}
										stopOpacity={isLight ? 0.35 : 0.45}
									/>
									<stop
										offset="100%"
										stopColor={colors.primary}
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke={colors.grid}
								vertical={false}
							/>
							<XAxis
								dataKey="label"
								tick={{ fill: colors.axis, fontSize: 11 }}
								axisLine={false}
								tickLine={false}
							/>
							<YAxis
								allowDecimals={false}
								tick={{ fill: colors.axis, fontSize: 11 }}
								axisLine={false}
								tickLine={false}
								width={28}
							/>
							<Tooltip
								contentStyle={tooltipStyle}
								labelStyle={{ color: isLight ? "#0f172a" : "#f8fafc" }}
								itemStyle={{ color: colors.primary }}
								formatter={(value) => [
									`${Number(value || 0).toLocaleString()} events`,
									"Volume",
								]}
							/>
							<Area
								type="monotone"
								dataKey="count"
								stroke={colors.primary}
								strokeWidth={2.5}
								fill={`url(#auditVolumeFill-${gradientId})`}
								dot={false}
								activeDot={{
									r: 5,
									fill: colors.primary,
									stroke: isLight ? "#ffffff" : "#0f172a",
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
