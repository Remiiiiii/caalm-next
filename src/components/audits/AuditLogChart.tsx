"use client";

import { format } from "date-fns";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface AuditLogChartProps {
	data?: Array<{ date: string; count: number }>;
	isLoading?: boolean;
}

export function AuditLogChart({ data, isLoading }: AuditLogChartProps) {
	const chartData = (data || []).map((point) => ({
		...point,
		label: format(new Date(`${point.date}T00:00:00`), "MMM d"),
	}));

	return (
		<Card className="glass-card mb-6">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<p className="text-sm font-medium sidebar-gradient-text mb-4">
					Event volume (last 30 days)
				</p>
				{isLoading ? (
					<div className="h-40 w-full rounded-lg bg-slate-200/60 animate-pulse" />
				) : chartData.length === 0 ? (
					<div className="h-40 flex items-center justify-center text-sm text-slate-500">
						No event volume data for this period.
					</div>
				) : (
					<div className="h-40 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
								<XAxis
									dataKey="label"
									tick={{ fill: "#64748b", fontSize: 11 }}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									allowDecimals={false}
									tick={{ fill: "#64748b", fontSize: 11 }}
									axisLine={false}
									tickLine={false}
									width={28}
								/>
								<Tooltip
									contentStyle={{
										borderRadius: 8,
										border: "1px solid #e2e8f0",
										fontSize: 12,
									}}
									labelStyle={{ color: "#0f172a" }}
								/>
								<Bar dataKey="count" fill="#0f5384" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
